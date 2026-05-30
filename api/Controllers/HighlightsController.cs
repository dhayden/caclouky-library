using CacloukyLibrary.Data;
using CacloukyLibrary.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace CacloukyLibrary.Controllers;

[ApiController]
[Route("api/highlights")]
[Authorize(Policy = "AnyRole")]
public class HighlightsController : ControllerBase
{
    private readonly LibraryDbContext _db;
    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    public HighlightsController(LibraryDbContext db) => _db = db;

    // GET /api/highlights?sourceType=sermon&sourceRef=441003.pdf:15
    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] string? sourceType, [FromQuery] string? sourceRef)
    {
        var q = _db.UserHighlights.Where(h => h.UserId == UserId);
        if (!string.IsNullOrEmpty(sourceType)) q = q.Where(h => h.SourceType == sourceType);
        if (!string.IsNullOrEmpty(sourceRef))  q = q.Where(h => h.SourceRef  == sourceRef);
        return Ok(await q.OrderByDescending(h => h.CreatedAt).ToListAsync());
    }

    // POST /api/highlights
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] HighlightRequest req)
    {
        var h = new UserHighlight
        {
            UserId       = UserId,
            SourceType   = req.SourceType,
            SourceRef    = req.SourceRef,
            SelectedText = req.SelectedText,
            Color        = req.Color ?? "#FFD700"
        };
        _db.UserHighlights.Add(h);
        await _db.SaveChangesAsync();
        return Ok(h);
    }

    // DELETE /api/highlights/{id}
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var h = await _db.UserHighlights.FindAsync(id);
        if (h == null || h.UserId != UserId) return NotFound();
        _db.UserHighlights.Remove(h);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}

public record HighlightRequest(string SourceType, string SourceRef, string SelectedText, string? Color);
