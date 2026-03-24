using Microsoft.AspNetCore.Identity;

namespace CacloukyLibrary.Models;

public class ApplicationUser : IdentityUser
{
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string? Address { get; set; }
    public string? Phone { get; set; }
    public DateTime MemberSince { get; set; } = DateTime.UtcNow;
    public bool IsActive { get; set; } = true;

    public ICollection<Checkout> Checkouts { get; set; } = new List<Checkout>();
    public ICollection<Reservation> Reservations { get; set; } = new List<Reservation>();
}
