namespace CacloukyLibrary.Models;

public class PdfChunk
{
    public int Id { get; set; }
    public int DocumentId { get; set; }
    public int PageNumber { get; set; }
    public int ChunkIndex { get; set; }
    public string Content { get; set; } = "";
    // Gemini text-embedding-004 produces 768-dimension vectors, stored as JSON float array
    public string Embedding { get; set; } = "[]";

    public PdfDocument Document { get; set; } = null!;
}
