using System.Text.Json;
using CacloukyLibrary.Data;
using CacloukyLibrary.Models;
using Microsoft.EntityFrameworkCore;

namespace CacloukyLibrary.Services;

public class BibleService
{
    private readonly LibraryDbContext _db;
    private readonly HttpClient _http;
    private readonly ILogger<BibleService> _log;

    // Public domain KJV — Scrollmapper / aruljohn format
    private const string KjvUrl = "https://raw.githubusercontent.com/aruljohn/Bible-kjv/master/Bible.json";

    public BibleService(LibraryDbContext db, HttpClient http, ILogger<BibleService> log)
    {
        _db   = db;
        _http = http;
        _log  = log;
    }

    public bool IsSeeded() => _db.BibleVerses.Any();

    public async Task SeedAsync()
    {
        if (IsSeeded()) return;

        _log.LogInformation("Downloading KJV Bible from {Url}…", KjvUrl);
        var json = await _http.GetStringAsync(KjvUrl);

        // Format: array of { abbrev, name, chapters: [ [ "verse text", … ], … ] }
        using var doc   = JsonDocument.Parse(json);
        var books       = doc.RootElement.EnumerateArray().ToList();
        var batch       = new List<BibleVerse>(1000);
        int bookNumber  = 0;

        foreach (var book in books)
        {
            bookNumber++;
            var bookName = book.GetProperty("name").GetString() ?? "";
            var chapters = book.GetProperty("chapters").EnumerateArray().ToList();

            for (int ci = 0; ci < chapters.Count; ci++)
            {
                var verses = chapters[ci].EnumerateArray().ToList();
                for (int vi = 0; vi < verses.Count; vi++)
                {
                    batch.Add(new BibleVerse
                    {
                        BookNumber = bookNumber,
                        Book       = bookName,
                        Chapter    = ci + 1,
                        Verse      = vi + 1,
                        Text       = verses[vi].GetString() ?? ""
                    });

                    if (batch.Count >= 1000)
                    {
                        _db.BibleVerses.AddRange(batch);
                        await _db.SaveChangesAsync();
                        batch.Clear();
                    }
                }
            }
        }

        if (batch.Count > 0)
        {
            _db.BibleVerses.AddRange(batch);
            await _db.SaveChangesAsync();
        }

        _log.LogInformation("KJV Bible seeded — {Count} verses", await _db.BibleVerses.CountAsync());
    }

    public async Task<List<BibleVerse>> SearchAsync(string query, int limit = 30)
    {
        var q = query.Trim().ToLower();
        return await _db.BibleVerses
            .Where(v => EF.Functions.Like(v.Text.ToLower(), $"%{q}%"))
            .Take(limit)
            .ToListAsync();
    }

    public async Task<List<BibleVerse>> GetChapterAsync(string book, int chapter)
    {
        var bookLower = book.Trim().ToLower();
        return await _db.BibleVerses
            .Where(v => v.Book.ToLower() == bookLower && v.Chapter == chapter)
            .OrderBy(v => v.Verse)
            .ToListAsync();
    }

    public async Task<List<BibleVerse>> GetVersesAsync(string book, int chapter, int verseStart, int verseEnd)
    {
        var bookLower = book.Trim().ToLower();
        return await _db.BibleVerses
            .Where(v => v.Book.ToLower() == bookLower && v.Chapter == chapter
                        && v.Verse >= verseStart && v.Verse <= verseEnd)
            .OrderBy(v => v.Verse)
            .ToListAsync();
    }

    public async Task<List<string>> GetBooksAsync()
    {
        return await _db.BibleVerses
            .Select(v => v.Book)
            .Distinct()
            .OrderBy(b => _db.BibleVerses.Where(v => v.Book == b).Min(v => v.BookNumber))
            .ToListAsync();
    }
}
