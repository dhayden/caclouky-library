using CacloukyLibrary.Data;
using CacloukyLibrary.DTOs;
using CacloukyLibrary.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CacloukyLibrary.Controllers;

[ApiController]
[Route("api/sermon-docs")]
public class SermonDocsController : ControllerBase
{
    private readonly LibraryDbContext _db;
    private readonly PdfIndexService  _indexer;
    private readonly IndexingQueue    _queue;
    private readonly IndexingStatus   _status;

    public SermonDocsController(LibraryDbContext db, PdfIndexService indexer, IndexingQueue queue, IndexingStatus status)
    {
        _db      = db;
        _indexer = indexer;
        _queue   = queue;
        _status  = status;
    }

    // GET /api/sermon-docs
    [Authorize(Policy = "AnyRole")]
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var docs = await _db.PdfDocuments
            .OrderByDescending(d => d.UploadedAt)
            .Select(d => new SermonDocDto(d.Id, d.Title, d.FileName, d.PageCount, d.UploadedAt, d.IsIndexed, d.IndexedAt))
            .ToListAsync();
        return Ok(docs);
    }

    // GET /api/sermon-docs/index-status
    [Authorize(Policy = "AdminOnly")]
    [HttpGet("index-status")]
    public IActionResult GetIndexStatus() => Ok(_status);

    // POST /api/sermon-docs/upload
    [Authorize(Policy = "AdminOnly")]
    [HttpPost("upload")]
    [RequestSizeLimit(100_000_000)]
    public async Task<IActionResult> Upload(IFormFile file)
    {
        if (file == null || Path.GetExtension(file.FileName).ToLower() != ".pdf")
            return BadRequest("A PDF file is required.");

        var doc = await _indexer.SaveAndIndexAsync(file);
        var dto = new SermonDocDto(doc.Id, doc.Title, doc.FileName, doc.PageCount, doc.UploadedAt, doc.IsIndexed, doc.IndexedAt);
        return Ok(dto);
    }

    // POST /api/sermon-docs/5/reindex
    [Authorize(Policy = "AdminOnly")]
    [HttpPost("{id:int}/reindex")]
    public async Task<IActionResult> Reindex(int id)
    {
        try { await _indexer.ReindexAsync(id); return Ok(); }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    // POST /api/sermon-docs/index-all
    // Enqueues all unindexed PDFs from the sermon-pdfs folder as a background job
    [Authorize(Policy = "AdminOnly")]
    [HttpPost("index-all")]
    public async Task<IActionResult> IndexAll()
    {
        if (_status.IsRunning)
            return Conflict(new { message = "Indexing already in progress.", _status.Completed, _status.Total });

        var files = Directory.GetFiles(_indexer.StoragePath, "*.pdf");

        // Delete any partial records so unindexed files get reprocessed cleanly
        var unindexed = await _db.PdfDocuments.Where(d => !d.IsIndexed).ToListAsync();
        if (unindexed.Count > 0)
        {
            _db.PdfDocuments.RemoveRange(unindexed);
            await _db.SaveChangesAsync();
        }

        var indexed  = await _db.PdfDocuments.Select(d => d.FileName).ToListAsync();
        var newFiles = files
            .Select(f => (Path: f, Name: Path.GetFileName(f)))
            .Where(f => !indexed.Contains(f.Name))
            .Select(f => f.Path)
            .ToList();

        if (newFiles.Count == 0)
            return Ok(new { message = "All PDFs in the folder are already indexed.", queued = 0 });

        // Reset status and enqueue
        _status.IsRunning   = true;
        _status.Total       = newFiles.Count;
        _status.Completed   = 0;
        _status.Failed      = 0;
        _status.CurrentFile = "";
        _status.StartedAt   = DateTime.UtcNow;
        _status.Errors      = [];

        foreach (var path in newFiles)
            await _queue.Writer.WriteAsync(path);

        return Ok(new { message = $"Queued {newFiles.Count} PDF(s) for background indexing.", queued = newFiles.Count });
    }

    // DELETE /api/sermon-docs/5
    [Authorize(Policy = "AdminOnly")]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var doc = await _db.PdfDocuments.FindAsync(id);
        if (doc == null) return NotFound();

        var filePath = Path.Combine(_indexer.StoragePath, doc.FileName);
        if (System.IO.File.Exists(filePath)) System.IO.File.Delete(filePath);

        _db.PdfDocuments.Remove(doc);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
