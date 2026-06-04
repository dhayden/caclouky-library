using System.Text.Json;
using System.Text.RegularExpressions;
using CacloukyLibrary.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace CacloukyLibrary.Services;

public record Citation(string DocumentTitle, string FileName, int PageNumber, string Snippet, string? SermonDate, string? SectionTitle);
public record ScriptureRef(string Reference, string Book, int Chapter, int VerseStart, int VerseEnd);
public record SearchResult(string Answer, IReadOnlyList<Citation> Citations, IReadOnlyList<ScriptureRef> Scriptures);

public record PreloadedChunk(string Content, float[] Embedding, int PageNumber, string DocumentTitle, string FileName, string? SermonDate, string? SectionTitle);

public partial class SearchService
{
    private readonly LibraryDbContext _db;
    private readonly OllamaService _ollama;
    private readonly IMemoryCache _cache;
    private const int TopK = 4;
    internal const string ChunkCacheKey = "sermon_chunks";
    private static readonly TimeSpan ChunkCacheTtl = TimeSpan.FromMinutes(15);

    // Common English stopwords to ignore when extracting keywords
    private static readonly HashSet<string> Stopwords = new(StringComparer.OrdinalIgnoreCase)
    {
        "the","a","an","and","or","but","in","on","at","to","for","of","with","about","is","are",
        "was","were","be","been","have","has","had","do","does","did","will","would","could","should",
        "what","which","who","how","when","where","why","that","this","these","those","there","their",
        "his","her","its","our","your","my","me","him","us","them","it","he","she","we","they","i",
        "did","not","no","so","if","by","as","into","than","from","just","also","any","all","more",
    };

    public SearchService(LibraryDbContext db, OllamaService ollama, IMemoryCache cache)
    {
        _db     = db;
        _ollama = ollama;
        _cache  = cache;
    }

    // Used by the preload job: finds matching sermon content via Ollama embedding only, no LLM generation.
    // Returns null if no chunks meet the minimum similarity threshold.
    public async Task<string?> FindSermonContentAsync(string query, IReadOnlyList<PreloadedChunk> preloadedChunks, float minScore = 0.3f)
    {
        if (preloadedChunks.Count == 0) return null;

        var embedding = await _ollama.GetEmbeddingAsync(query);

        var top = preloadedChunks
            .Select(c => new { c.Content, c.DocumentTitle, c.PageNumber, c.SermonDate, c.SectionTitle, Score = CosineSimilarity(embedding, c.Embedding) })
            .OrderByDescending(c => c.Score)
            .Take(TopK)
            .Where(c => c.Score >= minScore)
            .ToList();

        if (top.Count == 0) return null;

        return string.Join("\n\n---\n\n",
            top.Select(c =>
            {
                var label = c.SermonDate ?? c.DocumentTitle;
                if (c.SectionTitle != null) label += $" — {c.SectionTitle}";
                return $"[{label}]\n{c.Content}";
            }));
    }

    public async Task<IReadOnlyList<PreloadedChunk>> LoadAllChunksAsync()
    {
        if (_cache.TryGetValue(ChunkCacheKey, out IReadOnlyList<PreloadedChunk>? cached) && cached != null)
            return cached;

        var rows = await _db.PdfChunks
            .Include(c => c.Document)
            .Where(c => c.Document.IsIndexed)
            .Select(c => new
            {
                c.Content,
                c.Embedding,
                c.PageNumber,
                DocumentTitle = c.Document.Title,
                FileName      = c.Document.FileName,
                c.SermonDate,
                c.SectionTitle,
            })
            .ToListAsync();

        var chunks = rows.Select(c => new PreloadedChunk(
            c.Content,
            JsonSerializer.Deserialize<float[]>(c.Embedding) ?? [],
            c.PageNumber,
            c.DocumentTitle,
            c.FileName,
            c.SermonDate,
            c.SectionTitle)).ToList();

        _cache.Set(ChunkCacheKey, (IReadOnlyList<PreloadedChunk>)chunks, ChunkCacheTtl);
        return chunks;
    }

    public async Task<SearchResult> AskAsync(string question)
    {
        var chunks = await LoadAllChunksAsync();
        if (chunks.Count == 0)
            return new SearchResult("No sermon documents have been indexed yet. Please ask an admin to upload and index the PDF files.", [], []);
        return await AskAsync(question, chunks);
    }

    public async Task<SearchResult> AskAsync(string question, IReadOnlyList<PreloadedChunk> preloadedChunks)
    {
        if (preloadedChunks.Count == 0)
            return new SearchResult("No sermon documents have been indexed yet. Please ask an admin to upload and index the PDF files.", [], []);

        // 1. Embed the question locally via Ollama
        var questionEmbedding = await _ollama.GetEmbeddingAsync(question);

        // 2. Extract significant keywords for hybrid boosting
        var keywords = question
            .Split(' ', StringSplitOptions.RemoveEmptyEntries)
            .Select(w => Regex.Replace(w, @"[^\w]", "").ToLower())
            .Where(w => w.Length > 3 && !Stopwords.Contains(w))
            .ToHashSet();

        // 3. Hybrid score: cosine similarity + keyword bonus
        var scored = preloadedChunks
            .Select(c =>
            {
                var semantic     = CosineSimilarity(questionEmbedding, c.Embedding);
                var contentLower = c.Content.ToLower();
                var keywordHits  = keywords.Count(kw => contentLower.Contains(kw));
                var keywordBoost = keywordHits > 0 ? 0.15f * Math.Min(keywordHits, 3) : 0f;
                return new { c.Content, c.PageNumber, c.DocumentTitle, c.FileName, c.SermonDate, c.SectionTitle, Score = semantic + keywordBoost };
            })
            .OrderByDescending(c => c.Score)
            .Take(TopK)
            .ToList();

        // 4. Build context and get answer from Ollama
        var contextChunks = scored.Select((c, i) =>
            $"[Source {i + 1}: {c.DocumentTitle}, Page {c.PageNumber}]\n{c.Content}");

        var rawAnswer = await _ollama.GetAnswerAsync(question, contextChunks);
        var (answer, scriptures) = ParseAnswer(rawAnswer);

        // 5. Deduplicate citations (include snippet and metadata for viewer highlighting)
        var citations = scored
            .Select(c => new Citation(c.DocumentTitle, c.FileName, c.PageNumber,
                c.Content.Length > 400 ? c.Content[..400] + "…" : c.Content,
                c.SermonDate, c.SectionTitle))
            .DistinctBy(c => (c.DocumentTitle, c.PageNumber))
            .ToList();

        return new SearchResult(answer, citations, scriptures);
    }

    private static (string Answer, List<ScriptureRef> Scriptures) ParseAnswer(string raw)
    {
        var idx = raw.IndexOf("SCRIPTURES:", StringComparison.OrdinalIgnoreCase);

        string answer;
        var refs = new List<ScriptureRef>();

        if (idx >= 0)
        {
            answer = raw[..idx].Trim();
            var block = raw[(idx + "SCRIPTURES:".Length)..].Trim();
            foreach (var line in block.Split('\n', StringSplitOptions.RemoveEmptyEntries))
            {
                var trimmed = line.Trim().TrimStart('-', '*', '•').Trim();
                if (!string.IsNullOrEmpty(trimmed) && !trimmed.Equals("none", StringComparison.OrdinalIgnoreCase))
                {
                    var parsed = TryParseRef(trimmed);
                    if (parsed != null) refs.Add(parsed);
                }
            }
        }
        else
        {
            answer = raw.Trim();
        }

        // Fallback: scan the full answer text for inline scripture references
        if (refs.Count == 0)
            refs = ExtractInlineRefs(answer);

        return (answer, refs.DistinctBy(r => r.Reference).ToList());
    }

    // Known Bible book names used to validate inline ref matches
    private static readonly HashSet<string> BibleBooks = new(StringComparer.OrdinalIgnoreCase)
    {
        "Genesis","Exodus","Leviticus","Numbers","Deuteronomy","Joshua","Judges","Ruth",
        "Samuel","Kings","Chronicles","Ezra","Nehemiah","Esther","Job","Psalm","Psalms",
        "Proverbs","Ecclesiastes","Isaiah","Jeremiah","Lamentations","Ezekiel","Daniel",
        "Hosea","Joel","Amos","Obadiah","Jonah","Micah","Nahum","Habakkuk","Zephaniah",
        "Haggai","Zechariah","Malachi","Matthew","Mark","Luke","John","Acts","Romans",
        "Corinthians","Galatians","Ephesians","Philippians","Colossians","Thessalonians",
        "Timothy","Titus","Philemon","Hebrews","James","Peter","Jude","Revelation",
        "Song","Solomon",
    };

    [GeneratedRegex(@"(?<![A-Za-z])((?:[123]\s)?[A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\s+(\d+)(?::(\d+)(?:-(\d+))?)?(?![A-Za-z])")]
    private static partial Regex InlineRefPattern();

    private static List<ScriptureRef> ExtractInlineRefs(string text)
    {
        var refs = new List<ScriptureRef>();
        foreach (Match m in InlineRefPattern().Matches(text))
        {
            var book = m.Groups[1].Value.Trim();
            // Validate the last word of the book name is a known Bible book word
            var lastWord = book.Split(' ')[^1];
            if (!BibleBooks.Contains(lastWord)) continue;
            var parsed = TryParseRef(m.Value.Trim());
            if (parsed != null) refs.Add(parsed);
        }
        return refs;
    }

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
