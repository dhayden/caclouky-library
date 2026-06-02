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
    private const int Parallelism = 6;

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ScripturePreloadStatus _status;
    private readonly ILogger<ScripturePreloadService> _logger;

    public ScripturePreloadService(IServiceScopeFactory scopeFactory, ScripturePreloadStatus status, ILogger<ScripturePreloadService> logger)
    {
        _scopeFactory = scopeFactory;
        _status       = status;
        _logger       = logger;
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
        _status.Cts                = cts;
        _status.IsRunning          = true;
        _status.Completed          = 0;
        _status.Skipped            = 0;
        _status.Failed             = 0;
        _status.StartedAt          = DateTime.UtcNow;
        _status.CurrentRef         = "";
        _status.EstimatedRemaining = null;

        try
        {
            using var initScope = _scopeFactory.CreateScope();
            var db = initScope.ServiceProvider.GetRequiredService<LibraryDbContext>();

            var allVerses = await db.BibleVerses
                .OrderBy(v => v.BookNumber).ThenBy(v => v.Chapter).ThenBy(v => v.Verse)
                .Select(v => new { v.Book, v.Chapter, v.Verse })
                .ToListAsync(cts.Token);

            var storedSet = (await db.ScriptureTeachings
                .Select(t => new { t.Book, t.Chapter, t.Verse })
                .ToListAsync(cts.Token))
                .Select(s => (s.Book, s.Chapter, s.Verse))
                .ToHashSet();

            var pending = allVerses.Where(v => !storedSet.Contains((v.Book, v.Chapter, v.Verse))).ToList();
            _status.Total   = allVerses.Count;
            _status.Skipped = allVerses.Count - pending.Count;
            _status.Completed = _status.Skipped;

            // Pre-load all PDF chunks once so each verse doesn't hit the DB
            var searchInit = initScope.ServiceProvider.GetRequiredService<SearchService>();
            var preloadedChunks = await searchInit.LoadAllChunksAsync();
            _logger.LogInformation("Scripture preload starting: {Pending} verses pending, {Chunks} PDF chunks loaded", pending.Count, preloadedChunks.Count);

            // counters[0] = processed (including failed), counters[1] = failed
            int[] counters = { 0, 0 };
            var stopwatch = System.Diagnostics.Stopwatch.StartNew();

            await Parallel.ForEachAsync(
                pending,
                new ParallelOptions { MaxDegreeOfParallelism = Parallelism, CancellationToken = cts.Token },
                async (v, ct) =>
                {
                    var refStr = $"{v.Book} {v.Chapter}:{v.Verse}";
                    _status.CurrentRef = refStr;

                    try
                    {
                        using var scope  = _scopeFactory.CreateScope();
                        var search = scope.ServiceProvider.GetRequiredService<SearchService>();
                        var saveDb = scope.ServiceProvider.GetRequiredService<LibraryDbContext>();

                        var content = await search.FindSermonContentAsync(refStr, preloadedChunks);
                        var teaching = content ?? NO_CONTENT;

                        if (!await saveDb.ScriptureTeachings.AnyAsync(
                                t => t.Book == v.Book && t.Chapter == v.Chapter && t.Verse == v.Verse, ct))
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
                            await saveDb.SaveChangesAsync(ct);
                        }
                    }
                    catch (OperationCanceledException) { throw; }
                    catch (Exception ex)
                    {
                        _logger.LogError("Preload failed {Ref}: {Message}", refStr, ex.Message);
                        Interlocked.Increment(ref counters[1]);
                        _status.Failed = counters[1];
                    }

                    var p = Interlocked.Increment(ref counters[0]);
                    _status.Completed = _status.Skipped + p;

                    if (p % 10 == 0)
                    {
                        var elapsed   = stopwatch.Elapsed.TotalSeconds;
                        var rate      = p / elapsed;
                        var remaining = (pending.Count - p) / rate;
                        var ts        = TimeSpan.FromSeconds(remaining);
                        _status.EstimatedRemaining = ts.TotalHours >= 1
                            ? $"{(int)ts.TotalHours}h {ts.Minutes}m"
                            : $"{ts.Minutes}m {ts.Seconds}s";
                    }
                });
        }
        catch (OperationCanceledException) { }
        finally
        {
            _status.IsRunning          = false;
            _status.CurrentRef         = "";
            _status.EstimatedRemaining = _status.Completed >= _status.Total ? "Done" : _status.EstimatedRemaining;
            _status.Cts                = null;
        }
    }
}
