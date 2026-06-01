using CacloukyLibrary.Data;
using CacloukyLibrary.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace CacloukyLibrary.Controllers;

[ApiController]
[Route("api/notes")]
[Authorize(Policy = "AnyRole")]
public class NotesController : ControllerBase
{
    private readonly LibraryDbContext _db;
    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    public NotesController(LibraryDbContext db) => _db = db;

    // GET /api/notes?folderId=1
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int? folderId)
    {
        var query = _db.UserNotes.Where(n => n.UserId == UserId);
        if (folderId.HasValue)
            query = query.Where(n => n.FolderId == folderId);
        return Ok(await query.OrderByDescending(n => n.UpdatedAt).ToListAsync());
    }

    // GET /api/notes/{id}
    [HttpGet("{id:int}")]
    public async Task<IActionResult> Get(int id)
    {
        var n = await _db.UserNotes.FindAsync(id);
        if (n == null || n.UserId != UserId) return NotFound();
        return Ok(n);
    }

    // POST /api/notes
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] NoteRequest req)
    {
        var n = new UserNote
        {
            UserId     = UserId,
            Title      = req.Title.Trim(),
            Content    = req.Content,
            SourceType = req.SourceType,
            SourceRef  = req.SourceRef,
            FolderId   = req.FolderId,
            CreatedAt  = DateTime.UtcNow,
            UpdatedAt  = DateTime.UtcNow
        };
        _db.UserNotes.Add(n);
        await _db.SaveChangesAsync();
        return Ok(n);
    }

    // PUT /api/notes/{id}
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] NoteRequest req)
    {
        var n = await _db.UserNotes.FindAsync(id);
        if (n == null || n.UserId != UserId) return NotFound();
        n.Title      = req.Title.Trim();
        n.Content    = req.Content;
        n.SourceType = req.SourceType;
        n.SourceRef  = req.SourceRef;
        n.FolderId   = req.FolderId;
        n.UpdatedAt  = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(n);
    }

    // DELETE /api/notes/{id}
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var n = await _db.UserNotes.FindAsync(id);
        if (n == null || n.UserId != UserId) return NotFound();
        _db.UserNotes.Remove(n);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}

public record NoteRequest(string Title, string Content, string? SourceType, string? SourceRef, int? FolderId);
