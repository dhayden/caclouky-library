namespace CacloukyLibrary.Models;

public class PdfDocument
{
    public int Id { get; set; }
    public string Title { get; set; } = "";
    public string FileName { get; set; } = "";
    public int PageCount { get; set; }
    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
    public bool IsIndexed { get; set; }
    public DateTime? IndexedAt { get; set; }

    public ICollection<PdfChunk> Chunks { get; set; } = [];
}
