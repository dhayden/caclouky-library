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
    public string? EstimatedRemaining { get; set; }

    internal CancellationTokenSource? Cts { get; set; }
}

public class ScripturePreloadService
{
    private const string NO_CONTENT = "No content available for this scripture";

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ScripturePreloadStatus _status;

    public ScripturePreloadService(IServiceScopeFactory scopeFactory, ScripturePreloadStatus status)
    {
        _scopeFactory = scopeFactory;
        _status       = status;
    }

    public void Cancel()
    {
        _status.Cts?.Cancel();
    }

    // Iterates every verse in the BibleVerses table and permanently stores
    // what Bro. Sowders taught on it. Saves NO_CONTENT placeholder for
    // verses he did not address. Skips verses already stored.
    public async Task RunAsync()
    {
        if (_status.IsRunning) return;

        var cts = new CancellationTokenSource();
        _status.Cts               = cts;
        _status.IsRunning         = true;
        _status.Completed         = 0;
        _status.Skipped           = 0;
        _status.Failed            = 0;
        _status.StartedAt         = DateTime.UtcNow;
        _status.CurrentRef        = "";
        _status.EstimatedRemaining = null;

        try
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<LibraryDbContext>();

            // Load all verses ordered canonically
            var allVerses = await db.BibleVerses
                .OrderBy(v => v.BookNumber).ThenBy(v => v.Chapter).ThenBy(v => v.Verse)
                .Select(v => new { v.Book, v.Chapter, v.Verse })
                .ToListAsync(cts.Token);

            // Load already-stored set
            var stored = await db.ScriptureTeachings
                .Select(t => new { t.Book, t.Chapter, t.Verse })
                .ToListAsync(cts.Token);
            var storedSet = stored.Select(s => (s.Book, s.Chapter, s.Verse)).ToHashSet();

            var pending = allVerses.Where(v => !storedSet.Contains((v.Book, v.Chapter, v.Verse))).ToList();
            _status.Total = allVerses.Count;
            _status.Skipped = allVerses.Count - pending.Count;
            _status.Completed = _status.Skipped;

            var processed = 0;
            var stopwatch = System.Diagnostics.Stopwatch.StartNew();

            foreach (var v in pending)
            {
                if (cts.Token.IsCancellationRequested) break;

                var refStr = $"{v.Book} {v.Chapter}:{v.Verse}";
                _status.CurrentRef = refStr;

                try
                {
                    using var queryScope = _scopeFactory.CreateScope();
                    var search = queryScope.ServiceProvider.GetRequiredService<SearchService>();

                    var question = $"What did Brother William Sowders teach about {refStr}? " +
                                   "Answer only from the provided sermon materials. " +
                                   "If the sermon materials contain no specific teaching about this scripture, " +
                                   "respond with exactly: NO_CONTENT";

                    var result = await search.AskAsync(question);

                    var teaching = result.Answer.Trim().Equals("NO_CONTENT", StringComparison.OrdinalIgnoreCase)
                        || result.Citations.Count == 0 && result.Answer.Length < 80
                        ? NO_CONTENT
                        : result.Answer;

                    using var saveScope = _scopeFactory.CreateScope();
                    var saveDb = saveScope.ServiceProvider.GetRequiredService<LibraryDbContext>();

                    if (!await saveDb.ScriptureTeachings.AnyAsync(
                            t => t.Book == v.Book && t.Chapter == v.Chapter && t.Verse == v.Verse,
                            cts.Token))
                    {
                        saveDb.ScriptureTeachings.Add(new ScriptureTeaching
                        {
                            Reference   = refStr,
                            Book        = v.Book,
                            Chapter     = v.Chapter,
                            Verse       = v.Verse,
                            Teaching    = teaching,
                            GeneratedAt = DateTime.UtcNow,
                        });
                        await saveDb.SaveChangesAsync(cts.Token);
                    }
                }
                catch (OperationCanceledException) { break; }
                catch
                {
                    _status.Failed++;
                }

                processed++;
                _status.Completed++;

                // Update estimated time remaining every 10 verses
                if (processed % 10 == 0 && processed > 0)
                {
                    var elapsed = stopwatch.Elapsed.TotalSeconds;
                    var rate = processed / elapsed;
                    var remaining = (pending.Count - processed) / rate;
                    var ts = TimeSpan.FromSeconds(remaining);
                    _status.EstimatedRemaining = ts.TotalHours >= 1
                        ? $"{(int)ts.TotalHours}h {ts.Minutes}m"
                        : $"{ts.Minutes}m {ts.Seconds}s";
                }

                await Task.Delay(200, cts.Token).ConfigureAwait(false);
            }
        }
        catch (OperationCanceledException) { }
        finally
        {
            _status.IsRunning         = false;
            _status.CurrentRef        = "";
            _status.EstimatedRemaining = _status.Completed >= _status.Total ? "Done" : _status.EstimatedRemaining;
            _status.Cts               = null;
        }
    }
}
