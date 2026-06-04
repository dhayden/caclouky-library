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
    private readonly PdfIndexService _indexService;

    public SearchController(SearchService search, LibraryDbContext db, PdfIndexService indexService)
    {
        _search       = search;
        _db           = db;
        _indexService = indexService;
    }

    // Extracts a readable snippet centred on the matched phrase
    private static string ExtractSnippet(string text, string phrase)
    {
        var idx = text.IndexOf(phrase, StringComparison.OrdinalIgnoreCase);
        if (idx < 0) return text.Length > 400 ? text[..400] + "…" : text;
        var start = Math.Max(0, idx - 100);
        var end   = Math.Min(text.Length, idx + phrase.Length + 250);
        return (start > 0 ? "…" : "") + text[start..end] + (end < text.Length ? "…" : "");
    }

    private static string ExtractSnippetAllWords(string text, string[] terms)
    {
        // Find the earliest term and centre the snippet there
        var idx = terms
            .Select(t => text.IndexOf(t, StringComparison.OrdinalIgnoreCase))
            .Where(i => i >= 0)
            .DefaultIfEmpty(0)
            .Min();
        var start = Math.Max(0, idx - 80);
        var end   = Math.Min(text.Length, idx + 350);
        return (start > 0 ? "…" : "") + text[start..end] + (end < text.Length ? "…" : "");
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
    public IActionResult TextSearch([FromBody] TextSearchRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Query) || request.Query.Length < 2)
            return BadRequest("Query must be at least 2 characters.");

        var phrase = request.Query.Trim();
        var significantTerms = phrase
            .Split(' ', StringSplitOptions.RemoveEmptyEntries)
            .Where(t => t.Length > 2 && !SearchService.Stopwords.Contains(t))
            .ToArray();

        var sections = _indexService.GetGoK4Sections();
        if (sections.Count == 0)
            return Ok(new { exactMatches = Array.Empty<TextSearchResultDto>(), allWordMatches = Array.Empty<TextSearchResultDto>(), total = 0 });

        const string title = "Gospel of the Kingdom Papers";
        const string file  = "GoK4.html";

        var exactMatches = sections
            .Where(s => s.Text.Contains(phrase, StringComparison.OrdinalIgnoreCase))
            .OrderBy(s => s.Num)
            .Select(s => new TextSearchResultDto(title, file, s.Num, ExtractSnippet(s.Text, phrase), s.SermonDate, s.SectionTitle))
            .ToList();

        List<TextSearchResultDto> allWordMatches = [];
        if (significantTerms.Length > 0)
        {
            allWordMatches = sections
                .Where(s => !s.Text.Contains(phrase, StringComparison.OrdinalIgnoreCase)
                         && significantTerms.All(t => s.Text.Contains(t, StringComparison.OrdinalIgnoreCase)))
                .OrderBy(s => s.Num)
                .Select(s => new TextSearchResultDto(title, file, s.Num, ExtractSnippetAllWords(s.Text, significantTerms), s.SermonDate, s.SectionTitle))
                .ToList();
        }

        return Ok(new { exactMatches, allWordMatches, total = exactMatches.Count + allWordMatches.Count });
    }

    // GET /api/search/topics — all distinct section titles from GoK4 with occurrence count
    [AllowAnonymous]
    [HttpGet("topics")]
    public async Task<IActionResult> GetTopics()
    {
        var gokId = await _db.PdfDocuments
            .Where(d => d.IsIndexed && d.FileName.StartsWith("GoK4"))
            .Select(d => d.Id).FirstOrDefaultAsync();

        if (gokId == 0) return Ok(new { topics = Array.Empty<object>() });

        var topics = await _db.PdfChunks
            .Where(c => c.DocumentId == gokId && c.SectionTitle != null && c.SectionTitle != "")
            .GroupBy(c => c.SectionTitle!)
            .Select(g => new { topic = g.Key, count = g.Count() })
            .OrderBy(t => t.topic)
            .ToListAsync();

        return Ok(new { topics });
    }

    // GET /api/search/topic-sections?topic=Baptism — all GoK4 sections under a topic
    [AllowAnonymous]
    [HttpGet("topic-sections")]
    public async Task<IActionResult> GetTopicSections([FromQuery] string topic)
    {
        if (string.IsNullOrWhiteSpace(topic)) return BadRequest("topic is required.");

        var gokId = await _db.PdfDocuments
            .Where(d => d.IsIndexed && d.FileName.StartsWith("GoK4"))
            .Select(d => d.Id).FirstOrDefaultAsync();

        if (gokId == 0) return Ok(new { results = Array.Empty<object>() });

        var results = await _db.PdfChunks
            .Where(c => c.DocumentId == gokId && c.SectionTitle == topic)
            .OrderBy(c => c.PageNumber)
            .Select(c => new TextSearchResultDto(
                "Gospel of the Kingdom",
                "GoK4.html",
                c.PageNumber,
                c.Content.Length > 600 ? c.Content.Substring(0, 600) + "…" : c.Content,
                c.SermonDate,
                c.SectionTitle
            ))
            .ToListAsync();

        return Ok(new { results, total = results.Count });
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
