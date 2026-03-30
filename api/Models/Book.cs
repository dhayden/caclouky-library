namespace CacloukyLibrary.Models;

public class Book
{
    public int Id { get; set; }
    public string ISBN { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Author { get; set; } = string.Empty;
    public string? Publisher { get; set; }
    public int? PublishedYear { get; set; }
    public string? Genre { get; set; }
    public string? Description { get; set; }
    public string? CoverImageUrl { get; set; }
    public int TotalCopies { get; set; } = 1;
    public int AvailableCopies { get; set; } = 1;
    public bool IsRestricted { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<Checkout> Checkouts { get; set; } = new List<Checkout>();
    public ICollection<Reservation> Reservations { get; set; } = new List<Reservation>();
}
