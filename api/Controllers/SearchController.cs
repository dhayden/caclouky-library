using CacloukyLibrary.DTOs;
using CacloukyLibrary.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CacloukyLibrary.Controllers;

[ApiController]
[Route("api/search")]
[AllowAnonymous]
public class SearchController : ControllerBase
{
    private readonly SearchService _search;

    public SearchController(SearchService search) => _search = search;

    // POST /api/search/chat
    [HttpPost("chat")]
    public async Task<IActionResult> Chat([FromBody] ChatRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Question))
            return BadRequest("Question is required.");

        var result = await _search.AskAsync(request.Question);

        var response = new ChatResponse(
            result.Answer,
            result.Citations.Select(c => new CitationDto(c.DocumentTitle, c.FileName, c.PageNumber)).ToList(),
            result.Scriptures.Select(s => new ScriptureRefDto(s.Reference, s.Book, s.Chapter, s.VerseStart, s.VerseEnd)).ToList()
        );

        return Ok(response);
    }
}
