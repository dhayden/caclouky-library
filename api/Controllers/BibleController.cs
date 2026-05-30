using CacloukyLibrary.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CacloukyLibrary.Controllers;

[ApiController]
[Route("api/bible")]
public class BibleController : ControllerBase
{
    private readonly BibleService _bible;

    public BibleController(BibleService bible) => _bible = bible;

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

    [Authorize(Policy = "AdminOnly")][HttpPost("seed")]
    public async Task<IActionResult> Seed()
    {
        await _bible.SeedAsync();
        return Ok(new { message = "KJV Bible seeded." });
    }
}
