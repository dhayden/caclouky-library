using System.Security.Claims;
using System.Text.RegularExpressions;
using CacloukyLibrary.Data;
using CacloukyLibrary.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CacloukyLibrary.Controllers;

[ApiController]
[Route("api/bible")]
public class BibleController : ControllerBase
{
    private readonly BibleService _bible;
    private readonly LibraryDbContext _db;

    public BibleController(BibleService bible, LibraryDbContext db)
    {
        _bible = bible;
        _db    = db;
    }

    [AllowAnonymous][HttpGet("books")]
    public async Task<IActionResult> GetBooks() => Ok(await _bible.GetBooksAsync());

    [AllowAnonymous][HttpGet("search")]
    public async Task<IActionResult> Search([FromQuery] string q, [FromQuery] int limit = 30)
    {
        if (string.IsNullOrWhiteSpace(q)) return BadRequest("q is required.");
        return Ok(await _bible.SearchAsync(q, limit));
    }

    [AllowAnonymous][HttpGet("{book}/{chapter:int}")]
    public async Task<IActionResult> GetChapter(string book, int chapter)
    {
        var verses = await _bible.GetChapterAsync(book, chapter);
        if (!verses.Any()) return NotFound();
        return Ok(verses);
    }

    [AllowAnonymous][HttpGet("{book}/{chapter:int}/{verseStart:int}/{verseEnd:int}")]
    public async Task<IActionResult> GetVerses(string book, int chapter, int verseStart, int verseEnd)
    {
        var verses = await _bible.GetVersesAsync(book, chapter, verseStart, verseEnd);
        if (!verses.Any()) return NotFound();
        return Ok(verses);
    }

    // GET /api/bible/{book}/{chapter}/cross-references
    // Returns sermon PDF references grouped by verse number for a whole chapter.
    [AllowAnonymous][HttpGet("{book}/{chapter:int}/cross-references")]
    public async Task<IActionResult> GetCrossReferences(string book, int chapter)
    {
        var normalizedBook = BibleService.NormalizeBook(book);

        // Build search patterns covering common abbreviations too
        var searchPatterns = new[] { $"{normalizedBook} {chapter}:" };

        // Pull chunks that mention this chapter from any indexed sermon
        var chunks = await _db.PdfChunks
            .Include(c => c.Document)
            .Where(c => c.Document.IsIndexed &&
                        EF.Functions.Like(c.Content, $"%{normalizedBook} {chapter}:%"))
            .Select(c => new
            {
                c.Content,
                c.PageNumber,
                DocumentTitle = c.Document.Title,
                FileName      = c.Document.FileName
            })
            .ToListAsync();

        // Parse which verses each chunk references
        var pattern = new Regex(
            $@"\b{Regex.Escape(normalizedBook)}\s+{chapter}:(\d+)(?:-(\d+))?",
            RegexOptions.IgnoreCase);

        var result = new Dictionary<int, List<object>>();

        foreach (var chunk in chunks)
        {
            var matches = pattern.Matches(chunk.Content);
            var versesReferenced = new HashSet<int>();

            foreach (Match m in matches)
            {
                int start = int.Parse(m.Groups[1].Value);
                int end   = m.Groups[2].Success ? int.Parse(m.Groups[2].Value) : start;
                for (int v = start; v <= end; v++)
                    versesReferenced.Add(v);
            }

            foreach (int verse in versesReferenced)
            {
                if (!result.ContainsKey(verse))
                    result[verse] = [];

                // Deduplicate by fileName+pageNumber
                var already = result[verse].Any(x =>
                    ((dynamic)x).fileName == chunk.FileName &&
                    ((dynamic)x).pageNumber == chunk.PageNumber);

                if (!already && result[verse].Count < 8)
                    result[verse].Add(new
                    {
                        documentTitle = chunk.DocumentTitle,
                        fileName      = chunk.FileName,
                        pageNumber    = chunk.PageNumber
                    });
            }
        }

        return Ok(result);
    }

    // GET /api/bible/{book}/{chapter}/notes  (auth required — returns caller's notes)
    [Authorize(Policy = "AnyRole")][HttpGet("{book}/{chapter:int}/notes")]
    public async Task<IActionResult> GetChapterNotes(string book, int chapter)
    {
        var userId      = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var normalizedBook = BibleService.NormalizeBook(book);
        var prefix      = $"{normalizedBook}:{chapter}:";

        var notes = await _db.UserNotes
            .Where(n => n.UserId == userId &&
                        n.SourceType == "bible" &&
                        n.SourceRef != null &&
                        n.SourceRef.StartsWith(prefix))
            .ToListAsync();

        // Group by verse number extracted from sourceRef "{Book}:{Chapter}:{Verse}"
        var grouped = notes
            .GroupBy(n =>
            {
                var parts = n.SourceRef!.Split(':');
                return parts.Length >= 3 && int.TryParse(parts[2], out var v) ? v : 0;
            })
            .ToDictionary(g => g.Key, g => g.Select(n => new
            {
                n.Id, n.Title, n.Content, n.UpdatedAt
            }).ToList());

        return Ok(grouped);
    }

    [Authorize(Policy = "AdminOnly")][HttpPost("seed")]
    public async Task<IActionResult> Seed()
    {
        await _bible.SeedAsync();
        return Ok(new { message = "KJV Bible seeded." });
    }
}
