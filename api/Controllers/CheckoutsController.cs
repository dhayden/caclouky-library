using System.Security.Claims;
using CacloukyLibrary.Data;
using CacloukyLibrary.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CacloukyLibrary.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CheckoutsController : ControllerBase
{
    private readonly LibraryDbContext _db;
    private string CurrentUserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;
    private bool IsStaffOrAdmin => User.IsInRole("Admin") || User.IsInRole("Staff");

    public CheckoutsController(LibraryDbContext db) => _db = db;

    // GET /api/checkouts  (staff/admin: all | member: own)
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var query = _db.Checkouts
            .Include(c => c.Book)
            .Include(c => c.User)
            .AsQueryable();

        if (!IsStaffOrAdmin)
            query = query.Where(c => c.UserId == CurrentUserId);

        var result = await query
            .OrderByDescending(c => c.CheckedOutAt)
            .Select(c => new
            {
                c.Id, c.CheckedOutAt, c.DueDate, c.ReturnedAt, c.IsReturned, c.LateFee,
                book = new { c.Book.Id, c.Book.Title, c.Book.Author },
                user = new { c.User.Id, c.User.FirstName, c.User.LastName, c.User.Email }
            })
            .ToListAsync();

        return Ok(result);
    }

    // POST /api/checkouts  (staff/admin only)
    [Authorize(Policy = "StaffOrAdmin")]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateCheckoutRequest req)
    {
        var book = await _db.Books.FindAsync(req.BookId);
        if (book == null) return NotFound("Book not found.");
        if (book.AvailableCopies <= 0) return BadRequest("No copies available.");

        book.AvailableCopies--;
        var checkout = new Checkout
        {
            BookId = req.BookId,
            UserId = req.UserId,
            DueDate = DateTime.UtcNow.AddDays(req.LoanDays ?? 14)
        };

        _db.Checkouts.Add(checkout);
        await _db.SaveChangesAsync();
        return CreatedAtAction(null, new { id = checkout.Id }, checkout);
    }

    // PUT /api/checkouts/5/return
    [Authorize(Policy = "StaffOrAdmin")]
    [HttpPut("{id:int}/return")]
    public async Task<IActionResult> Return(int id)
    {
        var checkout = await _db.Checkouts.Include(c => c.Book).FirstOrDefaultAsync(c => c.Id == id);
        if (checkout == null) return NotFound();
        if (checkout.IsReturned) return BadRequest("Already returned.");

        checkout.ReturnedAt = DateTime.UtcNow;
        checkout.Book.AvailableCopies++;

        if (checkout.ReturnedAt > checkout.DueDate)
        {
            var daysLate = (checkout.ReturnedAt.Value - checkout.DueDate).Days;
            checkout.LateFee = daysLate * 0.25m;
        }

        await _db.SaveChangesAsync();
        return Ok(new { checkout.Id, checkout.ReturnedAt, checkout.LateFee });
    }

    public record CreateCheckoutRequest(int BookId, string UserId, int? LoanDays);
}
