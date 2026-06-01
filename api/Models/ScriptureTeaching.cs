namespace CacloukyLibrary.Models;

public class ScriptureTeaching
{
    public int Id { get; set; }
    public string Reference { get; set; } = "";  // e.g. "John 3:16"
    public string Book { get; set; } = "";
    public int Chapter { get; set; }
    public int Verse { get; set; }
    public string Teaching { get; set; } = "";
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
}
