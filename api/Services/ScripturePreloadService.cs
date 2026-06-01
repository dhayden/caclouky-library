using System.Text.RegularExpressions;
using CacloukyLibrary.Data;
using CacloukyLibrary.Models;
using Microsoft.EntityFrameworkCore;

namespace CacloukyLibrary.Services;

public class ScripturePreloadStatus
{
    public bool IsRunning { get; set; }
    public int Total { get; set; }
    public int Completed { get; set; }
    public int Skipped { get; set; }
    public int Failed { get; set; }
    public string CurrentRef { get; set; } = "";
    public DateTime? StartedAt { get; set; }
}

public partial class ScripturePreloadService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ScripturePreloadStatus _status;

    [GeneratedRegex(@"\b((?:\d\s)?[A-Za-z]+(?:\s[A-Za-z]+)?)\s+(\d+):(\d+)")]
    private static partial Regex ScriptureRefPattern();

    public ScripturePreloadService(IServiceScopeFactory scopeFactory, ScripturePreloadStatus status)
    {
        _scopeFactory = scopeFactory;
        _status       = status;
    }

    // Scans all sermon chunk content for scripture references (e.g. "John 3:16"),
    // then generates and permanently stores a teaching for each unique reference
    // that Bro. Sowders actually mentioned in his sermons.
    public async Task RunAsync(CancellationToken ct = default)
    {
        if (_status.IsRunning) return;
        _status.IsRunning  = true;
        _status.Completed  = 0;
        _status.Skipped    = 0;
        _status.Failed     = 0;
        _status.StartedAt  = DateTime.UtcNow;
        _status.CurrentRef = "";

        try
        {
            using var scope = _scopeFactory.CreateScope();
            var db      = scope.ServiceProvider.GetRequiredService<LibraryDbContext>();
            var search  = scope.ServiceProvider.GetRequiredService<SearchService>();

            // 1. Extract all scripture refs mentioned in sermon chunks
            var chunkTexts = await db.PdfChunks
                .Where(c => c.Document.IsIndexed)
                .Select(c => c.Content)
                .ToListAsync(ct);

            var refs = new HashSet<(string Book, int Chapter, int Verse, string Reference)>();
            foreach (var text in chunkTexts)
            {
                foreach (Match m in ScriptureRefPattern().Matches(text))
                {
                    var book    = m.Groups[1].Value.Trim();
                    var chapter = int.Parse(m.Groups[2].Value);
                    var verse   = int.Parse(m.Groups[3].Value);
                    var refStr  = $"{book} {chapter}:{verse}";
                    refs.Add((book, chapter, verse, refStr));
                }
            }

            _status.Total = refs.Count;

            // 2. Find which ones are already stored
            var existing = await db.ScriptureTeachings
                .Select(t => new { t.Book, t.Chapter, t.Verse })
                .ToListAsync(ct);
            var existingSet = existing.Select(e => (e.Book, e.Chapter, e.Verse)).ToHashSet();

            // 3. Generate and store teachings for missing refs
            foreach (var (book, chapter, verse, refStr) in refs)
            {
                if (ct.IsCancellationRequested) break;

                if (existingSet.Contains((book, chapter, verse)))
                {
                    _status.Skipped++;
                    _status.Completed++;
                    continue;
                }

                _status.CurrentRef = refStr;
                try
                {
                    var result = await search.AskAsync($"What did Brother Sowders teach about {refStr}?");

                    using var saveScope = _scopeFactory.CreateScope();
                    var saveDb = saveScope.ServiceProvider.GetRequiredService<LibraryDbContext>();

                    // Guard against duplicate inserts from concurrent runs
                    if (!await saveDb.ScriptureTeachings.AnyAsync(t => t.Book == book && t.Chapter == chapter && t.Verse == verse, ct))
                    {
                        saveDb.ScriptureTeachings.Add(new ScriptureTeaching
                        {
                            Reference   = refStr,
                            Book        = book,
                            Chapter     = chapter,
                            Verse       = verse,
                            Teaching    = result.Answer,
                            GeneratedAt = DateTime.UtcNow,
                        });
                        await saveDb.SaveChangesAsync(ct);
                    }
                }
                catch
                {
                    _status.Failed++;
                }

                _status.Completed++;
                await Task.Delay(300, ct); // rate-limit AI calls
            }
        }
        finally
        {
            _status.IsRunning  = false;
            _status.CurrentRef = "";
        }
    }
}
