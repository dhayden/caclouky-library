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
public class ReservationsController : ControllerBase
{
    private readonly LibraryDbContext _db;
    private string CurrentUserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;
    private bool IsStaffOrAdmin => User.IsInRole("Admin") || User.IsInRole("Staff");

    public ReservationsController(LibraryDbContext db) => _db = db;

    // GET /api/reservations
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var query = _db.Reservations.Include(r => r.Book).Include(r => r.User).AsQueryable();

        if (!IsStaffOrAdmin)
            query = query.Where(r => r.UserId == CurrentUserId);

        var result = await query
            .OrderByDescending(r => r.ReservedAt)
            .Select(r => new
            {
                r.Id, r.ReservedAt, r.AvailableAt,
                status = r.Status.ToString(),
                book = new { r.Book.Id, r.Book.Title, r.Book.Author },
                user = new { r.User.Id, r.User.FirstName, r.User.LastName }
            })
            .ToListAsync();

        return Ok(result);
    }

    // POST /api/reservations
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateReservationRequest req)
    {
        var book = await _db.Books.FindAsync(req.BookId);
        if (book == null) return NotFound("Book not found.");

        var existing = await _db.Reservations.AnyAsync(r =>
            r.BookId == req.BookId &&
            r.UserId == CurrentUserId &&
            r.Status == ReservationStatus.Pending);

        if (existing) return BadRequest("You already have an active reservation for this book.");

        var reservation = new Reservation
        {
            BookId = req.BookId,
            UserId = CurrentUserId
        };

        _db.Reservations.Add(reservation);
        await _db.SaveChangesAsync();
        return CreatedAtAction(null, new { id = reservation.Id }, reservation);
    }

    // PUT /api/reservations/5/cancel
    [HttpPut("{id:int}/cancel")]
    public async Task<IActionResult> Cancel(int id)
    {
        var reservation = await _db.Reservations.FindAsync(id);
        if (reservation == null) return NotFound();
        if (!IsStaffOrAdmin && reservation.UserId != CurrentUserId) return Forbid();
        if (reservation.Status == ReservationStatus.Fulfilled) return BadRequest("Cannot cancel a fulfilled reservation.");

        reservation.Status = ReservationStatus.Cancelled;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // PUT /api/reservations/5/ready  (staff/admin — notify member)
    [Authorize(Policy = "StaffOrAdmin")]
    [HttpPut("{id:int}/ready")]
    public async Task<IActionResult> MarkReady(int id)
    {
        var reservation = await _db.Reservations.FindAsync(id);
        if (reservation == null) return NotFound();

        reservation.Status = ReservationStatus.Ready;
        reservation.AvailableAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    public record CreateReservationRequest(int BookId);
}
