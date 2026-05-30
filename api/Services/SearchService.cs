using System.Text.Json;
using System.Text.RegularExpressions;
using CacloukyLibrary.Data;
using Microsoft.EntityFrameworkCore;

namespace CacloukyLibrary.Services;

public record Citation(string DocumentTitle, string FileName, int PageNumber);
public record ScriptureRef(string Reference, string Book, int Chapter, int VerseStart, int VerseEnd);
public record SearchResult(string Answer, IReadOnlyList<Citation> Citations, IReadOnlyList<ScriptureRef> Scriptures);

public partial class SearchService
{
    private readonly LibraryDbContext _db;
    private readonly OllamaService _ollama;
    private readonly GeminiService _gemini;
    private const int TopK = 5;

    public SearchService(LibraryDbContext db, OllamaService ollama, GeminiService gemini)
    {
        _db     = db;
        _ollama = ollama;
        _gemini = gemini;
    }

    public async Task<SearchResult> AskAsync(string question)
    {
        // 1. Embed the question locally via Ollama (free, no quota)
        var questionEmbedding = await _ollama.GetEmbeddingAsync(question);

        // 2. Load all chunks with their embeddings and document info
        var chunks = await _db.PdfChunks
            .Include(c => c.Document)
            .Where(c => c.Document.IsIndexed)
            .Select(c => new
            {
                c.Id,
                c.Content,
                c.Embedding,
                c.PageNumber,
                DocumentTitle = c.Document.Title,
                FileName      = c.Document.FileName
            })
            .ToListAsync();

        if (chunks.Count == 0)
            return new SearchResult("No sermon documents have been indexed yet. Please ask an admin to upload and index the PDF files.", [], []);

        // 3. Score each chunk by cosine similarity
        var scored = chunks
            .Select(c =>
            {
                var embedding  = JsonSerializer.Deserialize<float[]>(c.Embedding) ?? [];
                var similarity = CosineSimilarity(questionEmbedding, embedding);
                return new { c.Content, c.PageNumber, c.DocumentTitle, c.FileName, Similarity = similarity };
            })
            .OrderByDescending(c => c.Similarity)
            .Take(TopK)
            .ToList();

        // 4. Build context strings for the prompt
        var contextChunks = scored.Select((c, i) =>
            $"[Source {i + 1}: {c.DocumentTitle}, Page {c.PageNumber}]\n{c.Content}");

        // 5. Get answer from Gemini (includes SCRIPTURES: section)
        var rawAnswer = await _gemini.GetAnswerAsync(question, contextChunks);

        // 6. Split answer from scripture list
        var (answer, scriptures) = ParseAnswer(rawAnswer);

        // 7. Deduplicate citations by document+page
        var citations = scored
            .Select(c => new Citation(c.DocumentTitle, c.FileName, c.PageNumber))
            .DistinctBy(c => (c.DocumentTitle, c.PageNumber))
            .ToList();

        return new SearchResult(answer, citations, scriptures);
    }

    private static (string Answer, List<ScriptureRef> Scriptures) ParseAnswer(string raw)
    {
        var idx = raw.IndexOf("SCRIPTURES:", StringComparison.OrdinalIgnoreCase);
        if (idx < 0) return (raw.Trim(), []);

        var answer      = raw[..idx].Trim();
        var scriptureBlock = raw[(idx + "SCRIPTURES:".Length)..].Trim();

        var refs = new List<ScriptureRef>();
        foreach (var line in scriptureBlock.Split('\n', StringSplitOptions.RemoveEmptyEntries))
        {
            var trimmed = line.Trim().TrimStart('-', '*', '•').Trim();
            if (string.IsNullOrEmpty(trimmed) || trimmed.Equals("none", StringComparison.OrdinalIgnoreCase))
                continue;

            var parsed = TryParseRef(trimmed);
            if (parsed != null) refs.Add(parsed);
        }

        return (answer, refs);
    }

    // Matches: "John 3:16", "1 Corinthians 13:4-7", "Psalm 23", "Genesis 1:1"
    [GeneratedRegex(@"^((?:\d\s)?[A-Za-z]+(?:\s[A-Za-z]+)?)\s+(\d+)(?::(\d+)(?:-(\d+))?)?")]
    private static partial Regex ScripturePattern();

    private static ScriptureRef? TryParseRef(string text)
    {
        var m = ScripturePattern().Match(text);
        if (!m.Success) return null;

        var book    = m.Groups[1].Value.Trim();
        var chapter = int.Parse(m.Groups[2].Value);
        var vStart  = m.Groups[3].Success ? int.Parse(m.Groups[3].Value) : 1;
        var vEnd    = m.Groups[4].Success ? int.Parse(m.Groups[4].Value) : vStart;

        var reference = vStart == vEnd && !m.Groups[3].Success
            ? $"{book} {chapter}"
            : vStart == vEnd
                ? $"{book} {chapter}:{vStart}"
                : $"{book} {chapter}:{vStart}-{vEnd}";

        return new ScriptureRef(reference, book, chapter, vStart, vEnd);
    }

    private static float CosineSimilarity(float[] a, float[] b)
    {
        if (a.Length != b.Length || a.Length == 0) return 0f;

        float dot = 0, magA = 0, magB = 0;
        for (int i = 0; i < a.Length; i++)
        {
            dot  += a[i] * b[i];
            magA += a[i] * a[i];
            magB += b[i] * b[i];
        }

        var denom = MathF.Sqrt(magA) * MathF.Sqrt(magB);
        return denom == 0 ? 0f : dot / denom;
    }
}
