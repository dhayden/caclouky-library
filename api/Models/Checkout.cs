namespace CacloukyLibrary.Models;

public class Checkout
{
    public int Id { get; set; }
    public int BookId { get; set; }
    public string UserId { get; set; } = string.Empty;
    public DateTime CheckedOutAt { get; set; } = DateTime.UtcNow;
    public DateTime DueDate { get; set; }
    public DateTime? ReturnedAt { get; set; }
    public bool IsReturned => ReturnedAt.HasValue;
    public decimal? LateFee { get; set; }

    public Book Book { get; set; } = null!;
    public ApplicationUser User { get; set; } = null!;
}
