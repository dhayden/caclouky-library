using CacloukyLibrary.Data;
using CacloukyLibrary.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace CacloukyLibrary.Controllers;

[ApiController]
[Route("api/search-history")]
[Authorize(Policy = "AnyRole")]
public class SearchHistoryController : ControllerBase
{
    private readonly LibraryDbContext _db;
    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    public SearchHistoryController(LibraryDbContext db) => _db = db;

    // GET /api/search-history?type=sermon
    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] string? type)
    {
        var q = _db.SearchHistories.Where(h => h.UserId == UserId);
        if (!string.IsNullOrEmpty(type)) q = q.Where(h => h.Type == type);
        var results = await q.OrderByDescending(h => h.CreatedAt).Take(50).ToListAsync();
        return Ok(results);
    }

    // POST /api/search-history
    [HttpPost]
    public async Task<IActionResult> Save([FromBody] SaveHistoryRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Query)) return BadRequest();
        _db.SearchHistories.Add(new SearchHistory
        {
            UserId    = UserId,
            Query     = req.Query.Trim(),
            Type      = req.Type ?? "sermon",
            CreatedAt = DateTime.UtcNow
        });
        await _db.SaveChangesAsync();
        return Ok();
    }

    // DELETE /api/search-history/{id}
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var h = await _db.SearchHistories.FindAsync(id);
        if (h == null || h.UserId != UserId) return NotFound();
        _db.SearchHistories.Remove(h);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // DELETE /api/search-history
    [HttpDelete]
    public async Task<IActionResult> ClearAll()
    {
        var items = _db.SearchHistories.Where(h => h.UserId == UserId);
        _db.SearchHistories.RemoveRange(items);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}

public record SaveHistoryRequest(string Query, string? Type);
