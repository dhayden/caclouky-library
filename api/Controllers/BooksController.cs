using CacloukyLibrary.Data;
using CacloukyLibrary.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CacloukyLibrary.Controllers;

[ApiController]
[Route("api/[controller]")]
public class BooksController : ControllerBase
{
    private readonly LibraryDbContext _db;

    public BooksController(LibraryDbContext db) => _db = db;

    // GET /api/books?search=&genre=&page=1&pageSize=20
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? search,
        [FromQuery] string? genre,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var isMinisterOrAdmin = User.IsInRole("Admin") || User.IsInRole("Minister");
        var query = _db.Books.AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(b =>
                b.Title.Contains(search) ||
                b.Author.Contains(search) ||
                b.ISBN.Contains(search));

        if (!string.IsNullOrWhiteSpace(genre))
            query = query.Where(b => b.Genre == genre);

        var total = await query.CountAsync();
        var books = await query
            .OrderBy(b => b.Title)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(b => new
            {
                b.Id, b.ISBN, b.Title, b.Author, b.Genre,
                b.PublishedYear, b.CoverImageUrl,
                b.TotalCopies, b.AvailableCopies,
                b.IsRestricted
            })
            .ToListAsync();

        return Ok(new { total, page, pageSize, books });
    }

    // GET /api/books/5
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var book = await _db.Books.FindAsync(id);
        return book == null ? NotFound() : Ok(book);
    }

    // POST /api/books
    [Authorize(Policy = "MinisterOrAdmin")]
    [HttpPost]
    public async Task<IActionResult> Create(Book book)
    {
        _db.Books.Add(book);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = book.Id }, book);
    }

    // PUT /api/books/5
    [Authorize(Policy = "MinisterOrAdmin")]
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, Book updated)
    {
        if (id != updated.Id) return BadRequest();
        _db.Entry(updated).State = EntityState.Modified;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // DELETE /api/books/5
    [Authorize(Policy = "AdminOnly")]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var book = await _db.Books.FindAsync(id);
        if (book == null) return NotFound();
        _db.Books.Remove(book);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // GET /api/books/genres
    [HttpGet("genres")]
    public async Task<IActionResult> GetGenres()
    {
        var genres = await _db.Books
            .Where(b => b.Genre != null)
            .Select(b => b.Genre!)
            .Distinct()
            .OrderBy(g => g)
            .ToListAsync();
        return Ok(genres);
    }
}
