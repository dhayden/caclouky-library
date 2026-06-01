using CacloukyLibrary.Data;
using CacloukyLibrary.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace CacloukyLibrary.Controllers;

[ApiController]
[Route("api/note-folders")]
[Authorize(Policy = "AnyRole")]
public class NoteFoldersController : ControllerBase
{
    private readonly LibraryDbContext _db;
    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    public NoteFoldersController(LibraryDbContext db) => _db = db;

    // GET /api/note-folders
    [HttpGet]
    public async Task<IActionResult> GetAll() =>
        Ok(await _db.NoteFolders
            .Where(f => f.UserId == UserId)
            .OrderBy(f => f.Name)
            .Select(f => new { f.Id, f.Name, f.Color, f.CreatedAt, NoteCount = f.Notes.Count })
            .ToListAsync());

    // POST /api/note-folders
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] FolderRequest req)
    {
        var folder = new NoteFolder { UserId = UserId, Name = req.Name.Trim(), Color = req.Color, CreatedAt = DateTime.UtcNow };
        _db.NoteFolders.Add(folder);
        await _db.SaveChangesAsync();
        return Ok(new { folder.Id, folder.Name, folder.Color, folder.CreatedAt, NoteCount = 0 });
    }

    // PUT /api/note-folders/{id}
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] FolderRequest req)
    {
        var folder = await _db.NoteFolders.FindAsync(id);
        if (folder == null || folder.UserId != UserId) return NotFound();
        folder.Name = req.Name.Trim();
        folder.Color = req.Color;
        await _db.SaveChangesAsync();
        return Ok(folder);
    }

    // DELETE /api/note-folders/{id}
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var folder = await _db.NoteFolders.FindAsync(id);
        if (folder == null || folder.UserId != UserId) return NotFound();
        _db.NoteFolders.Remove(folder);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}

public record FolderRequest(string Name, string? Color);
