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

    // thiagobodruk/bible confirmed working — same chapter/verse array format, uses abbrev field
    private static readonly string[] KjvUrls =
    [
        "https://raw.githubusercontent.com/thiagobodruk/bible/master/json/en_kjv.json",
        "https://cdn.jsdelivr.net/gh/thiagobodruk/bible@master/json/en_kjv.json",
    ];

    // Canonical book names in Bible order (index 0 = Genesis = book 1)
    private static readonly string[] KjvBooks =
    [
        "Genesis","Exodus","Leviticus","Numbers","Deuteronomy","Joshua","Judges","Ruth",
        "1 Samuel","2 Samuel","1 Kings","2 Kings","1 Chronicles","2 Chronicles","Ezra",
        "Nehemiah","Esther","Job","Psalms","Proverbs","Ecclesiastes","Song of Solomon",
        "Isaiah","Jeremiah","Lamentations","Ezekiel","Daniel","Hosea","Joel","Amos",
        "Obadiah","Jonah","Micah","Nahum","Habakkuk","Zephaniah","Haggai","Zechariah","Malachi",
        "Matthew","Mark","Luke","John","Acts","Romans","1 Corinthians","2 Corinthians",
        "Galatians","Ephesians","Philippians","Colossians","1 Thessalonians","2 Thessalonians",
        "1 Timothy","2 Timothy","Titus","Philemon","Hebrews","James","1 Peter","2 Peter",
        "1 John","2 John","3 John","Jude","Revelation",
    ];

    // Maps common abbreviations → full KJV book names
    private static readonly Dictionary<string, string> Abbrevs = new(StringComparer.OrdinalIgnoreCase)
    {
        ["GEN"]="Genesis",["EXO"]="Exodus",["LEV"]="Leviticus",["NUM"]="Numbers",["DEU"]="Deuteronomy",
        ["JOS"]="Joshua",["JDG"]="Judges",["JUD"]="Judges",["RUT"]="Ruth",
        ["1SA"]="1 Samuel",["2SA"]="2 Samuel",["1KI"]="1 Kings",["2KI"]="2 Kings",
        ["1CH"]="1 Chronicles",["2CH"]="2 Chronicles",["EZR"]="Ezra",["NEH"]="Nehemiah",
        ["EST"]="Esther",["JOB"]="Job",["PSA"]="Psalms",["PSM"]="Psalms",["PRO"]="Proverbs",
        ["ECC"]="Ecclesiastes",["SNG"]="Song of Solomon",["SOS"]="Song of Solomon",
        ["ISA"]="Isaiah",["JER"]="Jeremiah",["LAM"]="Lamentations",
        ["EZK"]="Ezekiel",["EZE"]="Ezekiel",["DAN"]="Daniel",["HOS"]="Hosea",
        ["JOL"]="Joel",["JOE"]="Joel",["AMO"]="Amos",["OBA"]="Obadiah",["JON"]="Jonah",
        ["MIC"]="Micah",["NAH"]="Nahum",["HAB"]="Habakkuk",["ZEP"]="Zephaniah",
        ["HAG"]="Haggai",["ZEC"]="Zechariah",["MAL"]="Malachi",
        ["MAT"]="Matthew",["MRK"]="Mark",["MAR"]="Mark",["MK"]="Mark",
        ["LUK"]="Luke",["LK"]="Luke",["JHN"]="John",["JN"]="John",
        ["ACT"]="Acts",["ROM"]="Romans",["1CO"]="1 Corinthians",["2CO"]="2 Corinthians",
        ["GAL"]="Galatians",["EPH"]="Ephesians",["PHP"]="Philippians",["PHI"]="Philippians",
        ["COL"]="Colossians",["1TH"]="1 Thessalonians",["2TH"]="2 Thessalonians",
        ["1TI"]="1 Timothy",["2TI"]="2 Timothy",["TIT"]="Titus",["PHM"]="Philemon",
        ["HEB"]="Hebrews",["JAS"]="James",["1PE"]="1 Peter",["2PE"]="2 Peter",
        ["1JN"]="1 John",["2JN"]="2 John",["3JN"]="3 John",["JDE"]="Jude",["REV"]="Revelation",
    };

    public BibleService(LibraryDbContext db, HttpClient http, ILogger<BibleService> log)
    {
        _db   = db;
        _http = http;
        _log  = log;
    }

    public bool IsSeeded() => _db.BibleVerses.Any();

    public static string NormalizeBook(string book)
    {
        var trimmed = book.Trim();
        return Abbrevs.TryGetValue(trimmed, out var full) ? full : trimmed;
    }

    public async Task SeedAsync()
    {
        if (IsSeeded()) return;

        string? json = null;
        foreach (var url in KjvUrls)
        {
            try
            {
                _log.LogInformation("Downloading KJV Bible from {Url}…", url);
                json = await _http.GetStringAsync(url);
                break;
            }
            catch (Exception ex)
            {
                _log.LogWarning("Failed to download from {Url}: {Msg}", url, ex.Message);
            }
        }
        if (json == null) { _log.LogError("All KJV download URLs failed."); return; }

        using var doc  = JsonDocument.Parse(json);
        var books      = doc.RootElement.EnumerateArray().ToList();
        var batch      = new List<BibleVerse>(1000);
        int bookNumber = 0;

        foreach (var book in books)
        {
            bookNumber++;
            // Use canonical name from our ordered array (JSON uses short abbrevs like "gn", "ex")
            var bookName = bookNumber <= KjvBooks.Length ? KjvBooks[bookNumber - 1] : book.GetProperty("abbrev").GetString() ?? "";
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
        var bookName = NormalizeBook(book).ToLower();
        return await _db.BibleVerses
            .Where(v => v.Book.ToLower() == bookName && v.Chapter == chapter)
            .OrderBy(v => v.Verse)
            .ToListAsync();
    }

    public async Task<List<BibleVerse>> GetVersesAsync(string book, int chapter, int verseStart, int verseEnd)
    {
        var bookName = NormalizeBook(book).ToLower();
        return await _db.BibleVerses
            .Where(v => v.Book.ToLower() == bookName && v.Chapter == chapter
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
