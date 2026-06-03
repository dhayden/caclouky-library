using CacloukyLibrary.Data;
using CacloukyLibrary.DTOs;
using CacloukyLibrary.Models;
using CacloukyLibrary.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CacloukyLibrary.Controllers;

[ApiController]
[Route("api/search")]
public class SearchController : ControllerBase
{
    private readonly SearchService _search;
    private readonly LibraryDbContext _db;

    public SearchController(SearchService search, LibraryDbContext db)
    {
        _search = search;
        _db     = db;
    }

    // POST /api/search/chat
    [AllowAnonymous]
    [HttpPost("chat")]
    public async Task<IActionResult> Chat([FromBody] ChatRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Question))
            return BadRequest("Question is required.");

        var result = await _search.AskAsync(request.Question);

        return Ok(new ChatResponse(
            result.Answer,
            result.Citations.Select(c => new CitationDto(c.DocumentTitle, c.FileName, c.PageNumber, c.Snippet, c.SermonDate, c.SectionTitle)).ToList(),
            result.Scriptures.Select(s => new ScriptureRefDto(s.Reference, s.Book, s.Chapter, s.VerseStart, s.VerseEnd)).ToList()
        ));
    }

    // POST /api/search/text
    [AllowAnonymous]
    [HttpPost("text")]
    public async Task<IActionResult> TextSearch([FromBody] TextSearchRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Query) || request.Query.Length < 3)
            return BadRequest("Query must be at least 3 characters.");

        var terms = request.Query
            .Split(' ', StringSplitOptions.RemoveEmptyEntries)
            .Where(t => t.Length > 2)
            .ToArray();

        if (terms.Length == 0) return BadRequest("No searchable terms.");

        var query = _db.PdfChunks
            .Include(c => c.Document)
            .Where(c => c.Document.IsIndexed);

        foreach (var term in terms)
        {
            var t = term;
            query = query.Where(c => EF.Functions.Like(c.Content, $"%{t}%"));
        }

        var results = await query
            .OrderBy(c => c.Document.Title).ThenBy(c => c.PageNumber)
            .Take(20)
            .Select(c => new TextSearchResultDto(
                c.Document.Title,
                c.Document.FileName,
                c.PageNumber,
                c.Content.Length > 400 ? c.Content.Substring(0, 400) + "…" : c.Content,
                c.SermonDate,
                c.SectionTitle
            ))
            .ToListAsync();

        return Ok(new { results });
    }

    // GET /api/search/scripture-teaching?book=John&chapter=3&verse=16
    // Searches GoK4 HTML chunks for verbatim Sowders teaching on the given verse.
    [AllowAnonymous]
    [HttpGet("scripture-teaching")]
    public async Task<IActionResult> GetScriptureTeaching([FromQuery] string book, [FromQuery] int chapter, [FromQuery] int verse)
    {
        if (string.IsNullOrWhiteSpace(book) || chapter < 1 || verse < 1)
            return BadRequest("book, chapter, and verse are required.");

        var refStr = $"{book} {chapter}:{verse}";

        var doc = await _db.PdfDocuments
            .Where(d => d.IsIndexed && d.FileName.StartsWith("GoK"))
            .OrderByDescending(d => d.IndexedAt)
            .FirstOrDefaultAsync();

        if (doc == null)
            return Ok(new
            {
                reference   = refStr,
                teaching    = "The Gospel of the Kingdom document has not been indexed yet. Please ask an admin to upload and index GoK4.html.",
                generatedAt = DateTime.UtcNow,
                fromStore   = false,
            });

        // Primary: look for chunks that explicitly mention the exact verse reference
        var chunks = await _db.PdfChunks
            .Where(c => c.DocumentId == doc.Id &&
                        (EF.Functions.Like(c.Content, $"%{refStr}%") ||
                         EF.Functions.Like(c.Content, $"%{book} {chapter}: {verse}%")))
            .OrderBy(c => c.PageNumber).ThenBy(c => c.ChunkIndex)
            .Take(3)
            .ToListAsync();

        // Fallback: broader chapter-level match
        if (chunks.Count == 0)
        {
            chunks = await _db.PdfChunks
                .Where(c => c.DocumentId == doc.Id &&
                            EF.Functions.Like(c.Content, $"%{book}%") &&
                            EF.Functions.Like(c.Content, $"% {chapter}:%"))
                .OrderBy(c => c.PageNumber).ThenBy(c => c.ChunkIndex)
                .Take(2)
                .ToListAsync();
        }

        if (chunks.Count == 0)
            return Ok(new
            {
                reference   = refStr,
                teaching    = $"No specific teaching found for {refStr} in the Gospel of the Kingdom Papers.",
                generatedAt = doc.IndexedAt ?? DateTime.UtcNow,
                fromStore   = true,
            });

        var teaching = string.Join("\n\n---\n\n", chunks.Select(c =>
        {
            var label = c.SermonDate ?? doc.Title;
            if (c.SectionTitle != null) label += $" — {c.SectionTitle}";
            return $"[{label}]\n{c.Content}";
        }));

        return Ok(new
        {
            reference   = refStr,
            teaching,
            generatedAt = doc.IndexedAt ?? DateTime.UtcNow,
            fromStore   = true,
        });
    }
}
