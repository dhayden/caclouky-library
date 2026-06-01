namespace CacloukyLibrary.Models;

public class NoteFolder
{
    public int Id { get; set; }
    public string UserId { get; set; } = "";
    public string Name { get; set; } = "";
    public string? Color { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<UserNote> Notes { get; set; } = [];
}
