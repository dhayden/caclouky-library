using System.Threading.Channels;
using CacloukyLibrary.Data;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace CacloukyLibrary.Services;

// Tracks live indexing progress — singleton so controller + worker share state
public class IndexingStatus
{
    public bool   IsRunning   { get; set; }
    public int    Total       { get; set; }
    public int    Completed   { get; set; }
    public int    Failed      { get; set; }
    public string CurrentFile { get; set; } = "";
    public DateTime? StartedAt { get; set; }
    public List<string> Errors { get; set; } = [];
}

// Queue of file paths waiting to be indexed
public class IndexingQueue
{
    private readonly Channel<string> _channel = Channel.CreateUnbounded<string>();
    public ChannelWriter<string> Writer => _channel.Writer;
    public ChannelReader<string> Reader => _channel.Reader;
}

// Long-running background worker that drains the queue
public class IndexingWorker : BackgroundService
{
    private readonly IndexingQueue  _queue;
    private readonly IndexingStatus _status;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<IndexingWorker> _logger;

    public IndexingWorker(
        IndexingQueue queue,
        IndexingStatus status,
        IServiceScopeFactory scopeFactory,
        ILogger<IndexingWorker> logger)
    {
        _queue       = queue;
        _status      = status;
        _scopeFactory = scopeFactory;
        _logger      = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await foreach (var filePath in _queue.Reader.ReadAllAsync(stoppingToken))
        {
            _status.CurrentFile = Path.GetFileName(filePath);
            try
            {
                using var scope   = _scopeFactory.CreateScope();
                var indexer       = scope.ServiceProvider.GetRequiredService<PdfIndexService>();

                await using var stream = File.OpenRead(filePath);
                var fileName = Path.GetFileName(filePath);
                var formFile = new FormFile(stream, 0, stream.Length, "file", fileName)
                {
                    Headers     = new HeaderDictionary(),
                    ContentType = "application/pdf"
                };

                await indexer.SaveAndIndexAsync(formFile);
                _status.Completed++;
                _logger.LogInformation("Indexed {File} ({Done}/{Total})", fileName, _status.Completed, _status.Total);
            }
            catch (Exception ex)
            {
                _status.Failed++;
                _status.Errors.Add($"{Path.GetFileName(filePath)}: {ex.Message}");
                _logger.LogError(ex, "Failed to index {File}", filePath);
            }

            if (_status.Completed + _status.Failed >= _status.Total)
            {
                _status.IsRunning   = false;
                _status.CurrentFile = "";
            }
        }
    }
}
