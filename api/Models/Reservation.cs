namespace CacloukyLibrary.Models;

public enum ReservationStatus { Pending, Ready, Fulfilled, Cancelled }

public class Reservation
{
    public int Id { get; set; }
    public int BookId { get; set; }
    public string UserId { get; set; } = string.Empty;
    public DateTime ReservedAt { get; set; } = DateTime.UtcNow;
    public DateTime? AvailableAt { get; set; }
    public ReservationStatus Status { get; set; } = ReservationStatus.Pending;

    public Book Book { get; set; } = null!;
    public ApplicationUser User { get; set; } = null!;
}
