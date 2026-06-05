using System.Text.RegularExpressions;
using CacloukyLibrary.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CacloukyLibrary.Controllers;

[ApiController]
[Route("api/gok")]
public class GokController : ControllerBase
{
    private readonly PdfIndexService _indexService;
    private static readonly Regex YearPattern = new(@"\b(\d{4})\b");

    public GokController(PdfIndexService indexService)
    {
        _indexService = indexService;
    }

    // GET /api/gok/toc — year-grouped table of contents
    [AllowAnonymous]
    [HttpGet("toc")]
    public IActionResult GetToc()
    {
        var sections = _indexService.GetGoK4Sections();

        var years = sections
            .Where(s => s.SermonDate != null)
            .Select(s => new { s.SermonDate, Year = YearPattern.Match(s.SermonDate!).Groups[1].Value })
            .Where(s => s.Year.Length == 4)
            .GroupBy(s => s.Year)
            .OrderBy(g => g.Key)
            .Select(g => new
            {
                year = g.Key,
                sermons = g.Select(s => s.SermonDate!).Distinct().ToList(),
            })
            .ToList();

        return Ok(new { years });
    }

    // GET /api/gok/sermon?date=... — all sections for a sermon date
    [AllowAnonymous]
    [HttpGet("sermon")]
    public IActionResult GetSermon([FromQuery] string date)
    {
        if (string.IsNullOrWhiteSpace(date)) return BadRequest("date is required.");

        var sections = _indexService.GetGoK4Sections()
            .Where(s => string.Equals(s.SermonDate, date, StringComparison.OrdinalIgnoreCase))
            .OrderBy(s => s.Num)
            .Select(s => new { s.SectionTitle, text = s.Text })
            .ToList();

        return Ok(new { sermonDate = date, sections });
    }
}
