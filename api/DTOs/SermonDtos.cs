namespace CacloukyLibrary.DTOs;

public record SermonDocDto(int Id, string Title, string FileName, int PageCount, DateTime UploadedAt, bool IsIndexed, DateTime? IndexedAt);

public record ChatRequest(string Question);

public record CitationDto(string DocumentTitle, string FileName, int PageNumber);

public record ChatResponse(string Answer, IReadOnlyList<CitationDto> Citations);
