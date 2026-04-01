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
    private bool IsMinisterOrAdmin => User.IsInRole("Admin") || User.IsInRole("Minister");

    public ReservationsController(LibraryDbContext db) => _db = db;

    // GET /api/reservations
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var query = _db.Reservations.Include(r => r.Book).Include(r => r.User).AsQueryable();

        if (!IsMinisterOrAdmin)
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
        if (book == null) return NotFound(new { message = "Book not found." });
        if (book.IsRestricted && !User.IsInRole("Admin") && !User.IsInRole("Minister"))
            return StatusCode(403, new { message = "This book is for Ministers only." });

        var existing = await _db.Reservations.AnyAsync(r =>
            r.BookId == req.BookId &&
            r.UserId == CurrentUserId &&
            r.Status == ReservationStatus.Pending);

        if (existing) return BadRequest(new { message = "You already have an active reservation for this book." });

        var reservation = new Reservation
        {
            BookId = req.BookId,
            UserId = CurrentUserId
        };

        _db.Reservations.Add(reservation);
        await _db.SaveChangesAsync();
        return Ok(new { id = reservation.Id, status = reservation.Status.ToString(), reservedAt = reservation.ReservedAt });
    }

    // PUT /api/reservations/5/cancel
    [HttpPut("{id:int}/cancel")]
    public async Task<IActionResult> Cancel(int id)
    {
        var reservation = await _db.Reservations.FindAsync(id);
        if (reservation == null) return NotFound();
        if (!IsMinisterOrAdmin && reservation.UserId != CurrentUserId) return Forbid();
        if (reservation.Status == ReservationStatus.Fulfilled) return BadRequest(new { message = "Cannot cancel a fulfilled reservation." });

        reservation.Status = ReservationStatus.Cancelled;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // PUT /api/reservations/5/ready  (admin — book pulled from shelf)
    [Authorize(Policy = "AdminOnly")]
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

    // PUT /api/reservations/5/fulfill  (admin — member picked up, checkout processed)
    [Authorize(Policy = "AdminOnly")]
    [HttpPut("{id:int}/fulfill")]
    public async Task<IActionResult> Fulfill(int id)
    {
        var reservation = await _db.Reservations.FindAsync(id);
        if (reservation == null) return NotFound();

        reservation.Status = ReservationStatus.Fulfilled;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    public record CreateReservationRequest(int BookId);
}
