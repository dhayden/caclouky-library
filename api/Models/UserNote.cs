namespace CacloukyLibrary.Models;

public class UserNote
{
    public int Id { get; set; }
    public string UserId { get; set; } = "";
    public string Title { get; set; } = "";
    public string Content { get; set; } = "";
    public string? SourceType { get; set; } // "sermon" | "bible" | null
    public string? SourceRef { get; set; } // optional link to sermon page or bible ref
    public int? FolderId { get; set; }
    public NoteFolder? Folder { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
