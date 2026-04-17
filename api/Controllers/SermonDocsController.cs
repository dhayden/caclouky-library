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
    private readonly PdfIndexService _indexer;

    public SermonDocsController(LibraryDbContext db, PdfIndexService indexer)
    {
        _db      = db;
        _indexer = indexer;
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

    // POST /api/sermon-docs/upload  (multipart/form-data, field: file)
    [Authorize(Policy = "AdminOnly")]
    [HttpPost("upload")]
    [RequestSizeLimit(100_000_000)] // 100 MB
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
        try
        {
            await _indexer.ReindexAsync(id);
            return Ok();
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }

    // POST /api/sermon-docs/index-all
    // Scans the sermon-pdfs folder and indexes any PDFs not already in the database
    [Authorize(Policy = "AdminOnly")]
    [HttpPost("index-all")]
    public async Task<IActionResult> IndexAll()
    {
        var files = Directory.GetFiles(_indexer.StoragePath, "*.pdf");
        var existing = await _db.PdfDocuments.Select(d => d.FileName).ToListAsync();

        var newFiles = files
            .Select(Path.GetFileName)
            .Where(f => !existing.Contains(f))
            .ToList();

        if (newFiles.Count == 0)
            return Ok(new { message = "All PDFs already indexed.", indexed = 0 });

        int count = 0;
        foreach (var fileName in newFiles)
        {
            var filePath = Path.Combine(_indexer.StoragePath, fileName!);
            await using var stream = System.IO.File.OpenRead(filePath);
            var formFile = new FormFile(stream, 0, stream.Length, "file", fileName!)
            {
                Headers = new HeaderDictionary(),
                ContentType = "application/pdf"
            };
            await _indexer.SaveAndIndexAsync(formFile);
            count++;
        }

        return Ok(new { message = $"Indexed {count} new PDF(s).", indexed = count });
    }

    // DELETE /api/sermon-docs/5
    [Authorize(Policy = "AdminOnly")]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var doc = await _db.PdfDocuments.FindAsync(id);
        if (doc == null) return NotFound();

        var filePath = Path.Combine(_indexer.StoragePath, doc.FileName);
        if (System.IO.File.Exists(filePath))
            System.IO.File.Delete(filePath);

        _db.PdfDocuments.Remove(doc);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
