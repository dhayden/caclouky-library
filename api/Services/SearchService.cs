using System.Text.Json;
using CacloukyLibrary.Data;
using Microsoft.EntityFrameworkCore;

namespace CacloukyLibrary.Services;

public record Citation(string DocumentTitle, string FileName, int PageNumber);

public record SearchResult(string Answer, IReadOnlyList<Citation> Citations);

public class SearchService
{
    private readonly LibraryDbContext _db;
    private readonly GeminiService _gemini;
    private const int TopK = 5;

    public SearchService(LibraryDbContext db, GeminiService gemini)
    {
        _db     = db;
        _gemini = gemini;
    }

    public async Task<SearchResult> AskAsync(string question)
    {
        // 1. Embed the question
        var questionEmbedding = await _gemini.GetEmbeddingAsync(question);

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
            return new SearchResult("No sermon documents have been indexed yet. Please ask an admin to upload and index the PDF files.", []);

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

        // 5. Get answer from Gemini
        var answer = await _gemini.GetAnswerAsync(question, contextChunks);

        // 6. Deduplicate citations by document+page
        var citations = scored
            .Select(c => new Citation(c.DocumentTitle, c.FileName, c.PageNumber))
            .DistinctBy(c => (c.DocumentTitle, c.PageNumber))
            .ToList();

        return new SearchResult(answer, citations);
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
