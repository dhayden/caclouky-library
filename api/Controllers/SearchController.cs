using CacloukyLibrary.DTOs;
using CacloukyLibrary.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CacloukyLibrary.Controllers;

[ApiController]
[Route("api/search")]
[Authorize(Policy = "AnyRole")]
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
            result.Citations.Select(c => new CitationDto(c.DocumentTitle, c.FileName, c.PageNumber)).ToList()
        );

        return Ok(response);
    }
}
