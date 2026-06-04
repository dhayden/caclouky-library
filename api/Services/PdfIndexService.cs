using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using CacloukyLibrary.Data;
using CacloukyLibrary.Models;
using HtmlAgilityPack;
using Microsoft.Extensions.Caching.Memory;
using PdfPig = UglyToad.PdfPig.PdfDocument;

namespace CacloukyLibrary.Services;

public class PdfIndexService
{
    private readonly LibraryDbContext _db;
    private readonly OllamaService _ollama;
    private readonly IMemoryCache _cache;
    private readonly string _storageDir;
    private const int ChunkSize    = 500;
    private const int ChunkOverlap = 50;

    // Record carrying all metadata for a parsed section
    internal record SectionData(int Num, string? SermonDate, string? SectionTitle, string Text);

    public PdfIndexService(LibraryDbContext db, OllamaService ollama, IMemoryCache cache, IConfiguration config, IWebHostEnvironment env)
    {
        _db         = db;
        _ollama     = ollama;
        _cache      = cache;
        _storageDir = Path.Combine(env.ContentRootPath, config["SermonPdfs:StoragePath"] ?? "sermon-pdfs");
        Directory.CreateDirectory(_storageDir);
    }

    public string StoragePath => _storageDir;

    // Parses GoK4.html directly into sermon sections — results cached 24h.
    // Searching the source file avoids chunk-boundary gaps that exist in the DB index.
    internal IReadOnlyList<SectionData> GetGoK4Sections()
    {
        const string cacheKey = "gok4_file_sections";
        if (_cache.TryGetValue(cacheKey, out IReadOnlyList<SectionData>? cached) && cached != null)
            return cached;
        var filePath = Path.Combine(_storageDir, "GoK4.html");
        if (!File.Exists(filePath)) return [];
        var sections = (IReadOnlyList<SectionData>)ExtractHtmlSections(filePath);
        _cache.Set(cacheKey, sections, TimeSpan.FromHours(24));
        return sections;
    }

    public async Task<PdfDocument> SaveAndIndexAsync(IFormFile file)
    {
        var fileName = Path.GetFileName(file.FileName);
        var filePath = Path.Combine(_storageDir, fileName);
        if (!File.Exists(filePath))
        {
            await using var stream = new FileStream(filePath, FileMode.Create);
            await file.CopyToAsync(stream);
        }

        var sections = ExtractSections(filePath);

        var doc = new PdfDocument
        {
            Title      = Path.GetFileNameWithoutExtension(fileName),
            FileName   = fileName,
            PageCount  = sections.Count,
            UploadedAt = DateTime.UtcNow
        };
        _db.PdfDocuments.Add(doc);
        await _db.SaveChangesAsync();

        await IndexDocumentAsync(doc, sections);
        return doc;
    }

    public async Task ReindexAsync(int documentId)
    {
        var doc = await _db.PdfDocuments.FindAsync(documentId)
            ?? throw new KeyNotFoundException($"Document {documentId} not found.");

        var old = _db.PdfChunks.Where(c => c.DocumentId == documentId);
        _db.PdfChunks.RemoveRange(old);
        await _db.SaveChangesAsync();

        var filePath = Path.Combine(_storageDir, doc.FileName);
        var sections = ExtractSections(filePath);
        doc.PageCount = sections.Count;
        await IndexDocumentAsync(doc, sections);
    }

    private async Task IndexDocumentAsync(PdfDocument doc, List<SectionData> sections)
    {
        // Sub-split large sections into overlapping word-count chunks
        var chunks = BuildChunks(sections);
        int chunkIndex = 0;
        foreach (var (num, sermonDate, sectionTitle, text) in chunks)
        {
            var embedding     = await _ollama.GetEmbeddingAsync(text);
            var embeddingJson = JsonSerializer.Serialize(embedding);
            _db.PdfChunks.Add(new PdfChunk
            {
                DocumentId   = doc.Id,
                PageNumber   = num,
                ChunkIndex   = chunkIndex++,
                Content      = text,
                Embedding    = embeddingJson,
                SermonDate   = sermonDate,
                SectionTitle = sectionTitle,
            });
        }

        doc.IsIndexed = true;
        doc.IndexedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        _cache.Remove(SearchService.ChunkCacheKey);
    }

    // Splits any section that exceeds ChunkSize words into overlapping sub-chunks.
    // Sections within ChunkSize are kept whole — preserving semantic boundaries.
    private static List<SectionData> BuildChunks(List<SectionData> sections)
    {
        var result = new List<SectionData>();
        foreach (var s in sections)
        {
            var words = s.Text.Split(' ', StringSplitOptions.RemoveEmptyEntries);
            if (words.Length <= ChunkSize)
            {
                if (words.Length > 10) result.Add(s);
                continue;
            }
            int i = 0, sub = 0;
            while (i < words.Length)
            {
                var slice = words.Skip(i).Take(ChunkSize);
                var text  = string.Join(" ", slice).Trim();
                if (text.Length > 20)
                    result.Add(s with { Num = s.Num * 1000 + sub++, Text = text });
                i += ChunkSize - ChunkOverlap;
            }
        }
        return result;
    }

    private static List<SectionData> ExtractSections(string filePath) =>
        Path.GetExtension(filePath).ToLowerInvariant() == ".html"
            ? ExtractHtmlSections(filePath)
            : ExtractPdfSections(filePath);

    // PDF: each page becomes a section with no date/title metadata
    private static List<SectionData> ExtractPdfSections(string filePath)
    {
        var sections = new List<SectionData>();
        using var pdf = PdfPig.Open(filePath);
        foreach (var page in pdf.GetPages())
        {
            var text = string.Join(" ", page.GetWords().Select(w => w.Text));
            if (!string.IsNullOrWhiteSpace(text))
                sections.Add(new SectionData(page.Number, null, null, text));
        }
        return sections;
    }

    // HTML: semantic extraction that tracks sermon date (h2/h3) and topic (h4).
    // Each h3-level sermon section becomes one or more chunks with full date+topic metadata.
    private static List<SectionData> ExtractHtmlSections(string filePath)
    {
        var htmlDoc = new HtmlDocument();
        htmlDoc.Load(filePath);

        var removeNodes = htmlDoc.DocumentNode.SelectNodes("//script|//style|//head");
        if (removeNodes != null)
            foreach (var n in removeNodes.ToList()) n.Remove();

        var body = htmlDoc.DocumentNode.SelectSingleNode("//body") ?? htmlDoc.DocumentNode;

        var result        = new List<SectionData>();
        var current       = new StringBuilder();
        string? curDate   = null;
        string? curTitle  = null;
        int     sectionNum = 0;

        void Flush()
        {
            var text = current.ToString().Trim();
            if (text.Length > 30)
                result.Add(new SectionData(++sectionNum, curDate, curTitle, text));
            current.Clear();
        }

        var datePattern = new Regex(
            @"^(\d{4}|(?:January|February|March|April|May|June|July|August|September|October|November|December))",
            RegexOptions.IgnoreCase);

        foreach (var node in body.Descendants())
        {
            // Process raw text nodes directly — this captures text around inline elements
            // like <pb_link> and <u> that the old leaf-element check would skip entirely.
            if (node.NodeType == HtmlNodeType.Text)
            {
                if (node.ParentNode?.Name is "h1" or "h2" or "h3" or "h4" or "h5") continue;
                var txt = CleanText(node.InnerText);
                if (!string.IsNullOrEmpty(txt))
                    current.Append(txt + " ");
                continue;
            }

            if (node.NodeType != HtmlNodeType.Element) continue;

            switch (node.Name)
            {
                case "h1":
                case "h2":
                {
                    var txt = CleanText(node.InnerText);
                    if (datePattern.IsMatch(txt))
                    {
                        Flush();
                        curDate  = txt;
                        curTitle = null;
                    }
                    break;
                }
                case "h3":
                {
                    Flush();
                    curDate  = CleanText(node.InnerText);
                    curTitle = null;
                    break;
                }
                case "h4":
                {
                    if (current.Length > 100) Flush();
                    curTitle = CleanText(node.InnerText);
                    break;
                }
                case "h5":
                {
                    var label = CleanText(node.InnerText);
                    if (!string.IsNullOrEmpty(label))
                        current.Append($"\n{label}\n");
                    break;
                }
            }
        }

        Flush();
        return result;
    }

    private static string CleanText(string raw) =>
        Regex.Replace(HtmlEntity.DeEntitize(raw), @"\s+", " ").Trim();
}
