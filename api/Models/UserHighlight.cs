namespace CacloukyLibrary.Models;

public class UserHighlight
{
    public int Id { get; set; }
    public string UserId { get; set; } = "";
    public string SourceType { get; set; } = ""; // "sermon" | "bible"
    public string SourceRef { get; set; } = ""; // "fileName:page" or "Book:Chapter:Verse"
    public string SelectedText { get; set; } = "";
    public string Color { get; set; } = "#FFD700"; // yellow default
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
