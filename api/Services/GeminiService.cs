using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace CacloukyLibrary.Services;

public class GeminiService
{
    private readonly HttpClient _http;
    private readonly string _apiKey;
    private const string EmbedUrl  = "https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent";
    private const string ChatUrl   = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

    public GeminiService(HttpClient http, IConfiguration config)
    {
        _http   = http;
        _apiKey = config["Gemini:ApiKey"] ?? throw new InvalidOperationException("Gemini:ApiKey not configured.");
    }

    public async Task<float[]> GetEmbeddingAsync(string text)
    {
        var body = new
        {
            model   = "models/gemini-embedding-001",
            content = new { parts = new[] { new { text } } }
        };

        var response = await PostAsync(EmbedUrl, body);
        var values   = response.RootElement
            .GetProperty("embedding")
            .GetProperty("values")
            .EnumerateArray()
            .Select(v => v.GetSingle())
            .ToArray();
        return values;
    }

    public async Task<string> GetAnswerAsync(string question, IEnumerable<string> contextChunks)
    {
        var context = string.Join("\n\n---\n\n", contextChunks);

        var prompt = $"""
            You are a helpful assistant that answers questions about Bro. William Sowders' sermons and teachings.
            Use ONLY the source material provided below to answer the question.
            If the answer is not in the source material, say so clearly — do not guess.
            Be thorough but concise. Quote directly from the source when it strengthens the answer.

            SOURCE MATERIAL:
            {context}

            QUESTION:
            {question}
            """;

        var body = new
        {
            contents = new[]
            {
                new { role = "user", parts = new[] { new { text = prompt } } }
            }
        };

        var response = await PostAsync(ChatUrl, body);
        return response.RootElement
            .GetProperty("candidates")[0]
            .GetProperty("content")
            .GetProperty("parts")[0]
            .GetProperty("text")
            .GetString() ?? "";
    }

    private async Task<JsonDocument> PostAsync(string url, object body, int maxRetries = 5)
    {
        var json = JsonSerializer.Serialize(body);
        var delayMs = 2000;

        for (int attempt = 1; attempt <= maxRetries; attempt++)
        {
            var content = new StringContent(json, Encoding.UTF8, "application/json");
            var request = new HttpRequestMessage(HttpMethod.Post, url) { Content = content };
            request.Headers.TryAddWithoutValidation("x-goog-api-key", _apiKey);

            var resp = await _http.SendAsync(request);
            var raw  = await resp.Content.ReadAsStringAsync();

            if (resp.IsSuccessStatusCode)
                return JsonDocument.Parse(raw);

            // Rate limited — wait and retry
            if ((int)resp.StatusCode == 429 && attempt < maxRetries)
            {
                await Task.Delay(delayMs);
                delayMs *= 2; // exponential backoff
                continue;
            }

            throw new HttpRequestException($"Gemini API error {(int)resp.StatusCode}: {raw}");
        }

        throw new HttpRequestException("Gemini API: max retries exceeded.");
    }
}
