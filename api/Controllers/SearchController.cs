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
    private readonly ScripturePreloadService _preload;
    private readonly ScripturePreloadStatus _preloadStatus;

    public SearchController(SearchService search, LibraryDbContext db, ScripturePreloadService preload, ScripturePreloadStatus preloadStatus)
    {
        _search        = search;
        _db            = db;
        _preload       = preload;
        _preloadStatus = preloadStatus;
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
            result.Citations.Select(c => new CitationDto(c.DocumentTitle, c.FileName, c.PageNumber)).ToList(),
            result.Scriptures.Select(s => new ScriptureRefDto(s.Reference, s.Book, s.Chapter, s.VerseStart, s.VerseEnd)).ToList()
        ));
    }

    // GET /api/search/scripture-teaching?book=John&chapter=3&verse=16
    // Returns permanently stored teaching; generates and stores it if not yet available.
    [Authorize(Policy = "AnyRole")]
    [HttpGet("scripture-teaching")]
    public async Task<IActionResult> GetScriptureTeaching([FromQuery] string book, [FromQuery] int chapter, [FromQuery] int verse)
    {
        if (string.IsNullOrWhiteSpace(book) || chapter < 1 || verse < 1)
            return BadRequest("book, chapter, and verse are required.");

        var existing = await _db.ScriptureTeachings
            .FirstOrDefaultAsync(t => t.Book == book && t.Chapter == chapter && t.Verse == verse);

        if (existing != null)
            return Ok(new { existing.Reference, existing.Teaching, existing.GeneratedAt, fromStore = true });

        // Generate and store permanently
        var refStr = $"{book} {chapter}:{verse}";
        var result = await _search.AskAsync($"What did Brother Sowders teach about {refStr}?");

        var teaching = new ScriptureTeaching
        {
            Reference   = refStr,
            Book        = book,
            Chapter     = chapter,
            Verse       = verse,
            Teaching    = result.Answer,
            GeneratedAt = DateTime.UtcNow,
        };

        // Guard against race condition if two requests come in simultaneously
        if (!await _db.ScriptureTeachings.AnyAsync(t => t.Book == book && t.Chapter == chapter && t.Verse == verse))
        {
            _db.ScriptureTeachings.Add(teaching);
            await _db.SaveChangesAsync();
        }

        return Ok(new { teaching.Reference, teaching.Teaching, teaching.GeneratedAt, fromStore = false });
    }

    // POST /api/search/preload-teachings  (admin only)
    // Scans sermon chunks for referenced scriptures and pre-generates teachings for all of them.
    [Authorize(Policy = "AdminOnly")]
    [HttpPost("preload-teachings")]
    public IActionResult StartPreload()
    {
        if (_preloadStatus.IsRunning)
            return Conflict(new { message = "Preload already running.", _preloadStatus.Completed, _preloadStatus.Total });

        _ = Task.Run(() => _preload.RunAsync());
        return Ok(new { message = "Preload started. Poll /api/search/preload-status for progress." });
    }

    // GET /api/search/preload-status
    [Authorize(Policy = "AdminOnly")]
    [HttpGet("preload-status")]
    public IActionResult GetPreloadStatus() => Ok(new
    {
        _preloadStatus.IsRunning,
        _preloadStatus.Total,
        _preloadStatus.Completed,
        _preloadStatus.Skipped,
        _preloadStatus.Failed,
        _preloadStatus.CurrentRef,
        _preloadStatus.StartedAt,
        _preloadStatus.EstimatedRemaining,
        PercentComplete = _preloadStatus.Total > 0
            ? Math.Round(_preloadStatus.Completed * 100.0 / _preloadStatus.Total, 1)
            : 0,
    });

    // POST /api/search/cancel-preload
    [Authorize(Policy = "AdminOnly")]
    [HttpPost("cancel-preload")]
    public IActionResult CancelPreload()
    {
        if (!_preloadStatus.IsRunning) return BadRequest(new { message = "No preload is running." });
        _preload.Cancel();
        return Ok(new { message = "Cancellation requested." });
    }
}
