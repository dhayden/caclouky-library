namespace CacloukyLibrary.Models;

public class SearchHistory
{
    public int Id { get; set; }
    public string UserId { get; set; } = "";
    public string Query { get; set; } = "";
    public string Type { get; set; } = "sermon"; // "sermon" | "bible"
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
