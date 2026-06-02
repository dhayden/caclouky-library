using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using CacloukyLibrary.Data;
using CacloukyLibrary.Models;
using HtmlAgilityPack;
using PdfPig = UglyToad.PdfPig.PdfDocument;

namespace CacloukyLibrary.Services;

public class PdfIndexService
{
    private readonly LibraryDbContext _db;
    private readonly OllamaService _ollama;
    private readonly string _storageDir;
    private const int ChunkSize    = 500;  // words per chunk
    private const int ChunkOverlap = 50;   // word overlap between chunks

    public PdfIndexService(LibraryDbContext db, OllamaService ollama, IConfiguration config, IWebHostEnvironment env)
    {
        _db         = db;
        _ollama     = ollama;
        _storageDir = Path.Combine(env.ContentRootPath, config["SermonPdfs:StoragePath"] ?? "sermon-pdfs");
        Directory.CreateDirectory(_storageDir);
    }

    public string StoragePath => _storageDir;

    public async Task<PdfDocument> SaveAndIndexAsync(IFormFile file)
    {
        // Save file to disk (skip write if already there, e.g. bulk-indexed from folder)
        var fileName = Path.GetFileName(file.FileName);
        var filePath = Path.Combine(_storageDir, fileName);
        if (!File.Exists(filePath))
        {
            await using var stream = new FileStream(filePath, FileMode.Create);
            await file.CopyToAsync(stream);
        }

        // Extract text by page (or section for HTML)
        var pageTexts = ExtractContent(filePath);

        // Create document record
        var doc = new PdfDocument
        {
            Title     = Path.GetFileNameWithoutExtension(fileName),
            FileName  = fileName,
            PageCount = pageTexts.Count,
            UploadedAt = DateTime.UtcNow
        };
        _db.PdfDocuments.Add(doc);
        await _db.SaveChangesAsync();

        // Index immediately
        await IndexDocumentAsync(doc, pageTexts);
        return doc;
    }

    public async Task ReindexAsync(int documentId)
    {
        var doc = await _db.PdfDocuments.FindAsync(documentId)
            ?? throw new KeyNotFoundException($"Document {documentId} not found.");

        // Remove old chunks
        var old = _db.PdfChunks.Where(c => c.DocumentId == documentId);
        _db.PdfChunks.RemoveRange(old);
        await _db.SaveChangesAsync();

        var filePath  = Path.Combine(_storageDir, doc.FileName);
        var pageTexts = ExtractContent(filePath);
        doc.PageCount = pageTexts.Count;
        await IndexDocumentAsync(doc, pageTexts);
    }

    private async Task IndexDocumentAsync(PdfDocument doc, List<(int Page, string Text)> pageTexts)
    {
        var chunks = BuildChunks(pageTexts);
        foreach (var (page, chunkIndex, text) in chunks)
        {
            var embedding     = await _ollama.GetEmbeddingAsync(text);
            var embeddingJson = JsonSerializer.Serialize(embedding);
            _db.PdfChunks.Add(new PdfChunk
            {
                DocumentId = doc.Id,
                PageNumber = page,
                ChunkIndex = chunkIndex,
                Content    = text,
                Embedding  = embeddingJson
            });
        }

        doc.IsIndexed = true;
        doc.IndexedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
    }

    // Returns (page, chunkIndex, text) tuples
    private static List<(int Page, int ChunkIndex, string Text)> BuildChunks(List<(int Page, string Text)> pages)
    {
        var result = new List<(int, int, string)>();
        var allWords = new List<(int Page, string Word)>();

        foreach (var (page, text) in pages)
        {
            var words = text.Split(' ', StringSplitOptions.RemoveEmptyEntries);
            foreach (var w in words)
                allWords.Add((page, w));
        }

        int chunkIndex = 0;
        int i = 0;
        while (i < allWords.Count)
        {
            var slice     = allWords.Skip(i).Take(ChunkSize).ToList();
            var chunkText = string.Join(" ", slice.Select(w => w.Word)).Trim();
            var page      = slice[0].Page;

            if (chunkText.Length > 20)
                result.Add((page, chunkIndex++, chunkText));

            i += ChunkSize - ChunkOverlap;
        }

        return result;
    }

    private static List<(int Page, string Text)> ExtractContent(string filePath) =>
        Path.GetExtension(filePath).ToLowerInvariant() == ".html"
            ? ExtractHtmlContent(filePath)
            : ExtractPages(filePath);

    private static List<(int Page, string Text)> ExtractPages(string filePath)
    {
        var pages = new List<(int, string)>();
        using var pdf = PdfPig.Open(filePath);
        foreach (var page in pdf.GetPages())
        {
            var text = string.Join(" ", page.GetWords().Select(w => w.Text));
            if (!string.IsNullOrWhiteSpace(text))
                pages.Add((page.Number, text));
        }
        return pages;
    }

    // Splits HTML into sections by heading elements (h1/h2/h3), each treated as a page.
    // Falls back to the full document as a single page if no headings are found.
    private static List<(int Page, string Text)> ExtractHtmlContent(string filePath)
    {
        var htmlDoc = new HtmlDocument();
        htmlDoc.Load(filePath);

        // Remove non-content nodes
        var removeNodes = htmlDoc.DocumentNode.SelectNodes("//script|//style|//head");
        if (removeNodes != null)
            foreach (var node in removeNodes.ToList())
                node.Remove();

        var body = htmlDoc.DocumentNode.SelectSingleNode("//body") ?? htmlDoc.DocumentNode;

        var sections = new List<string>();
        var current  = new StringBuilder();

        foreach (var node in body.DescendantsAndSelf())
        {
            if (node.NodeType != HtmlNodeType.Element) continue;

            if (node.Name is "h1" or "h2" or "h3")
            {
                if (current.Length > 50)
                {
                    sections.Add(current.ToString().Trim());
                    current.Clear();
                }
            }

            if (node.NodeType == HtmlNodeType.Element && node.ChildNodes.All(c => c.NodeType != HtmlNodeType.Element))
            {
                var text = HtmlEntity.DeEntitize(node.InnerText);
                text = Regex.Replace(text, @"\s+", " ").Trim();
                if (!string.IsNullOrEmpty(text))
                    current.Append(text + " ");
            }
        }

        if (current.Length > 0)
            sections.Add(current.ToString().Trim());

        return sections.Count > 0
            ? sections.Select((s, i) => (i + 1, s)).ToList()
            : [];
    }
}
