namespace CacloukyLibrary.DTOs;

public record SermonDocDto(int Id, string Title, string FileName, int PageCount, DateTime UploadedAt, bool IsIndexed, DateTime? IndexedAt);

public record ChatRequest(string Question);

public record CitationDto(string DocumentTitle, string FileName, int PageNumber, string Snippet);

public record ScriptureRefDto(string Reference, string Book, int Chapter, int VerseStart, int VerseEnd);

public record ChatResponse(string Answer, IReadOnlyList<CitationDto> Citations, IReadOnlyList<ScriptureRefDto> Scriptures);

public record TextSearchRequest(string Query);

public record TextSearchResultDto(string DocumentTitle, string FileName, int PageNumber, string Snippet);
