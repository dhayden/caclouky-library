namespace CacloukyLibrary.Models;

public class BibleVerse
{
    public int Id { get; set; }
    public int BookNumber { get; set; }
    public string Book { get; set; } = "";
    public int Chapter { get; set; }
    public int Verse { get; set; }
    public string Text { get; set; } = "";
}
