using System.Text;
using System.Text.Json;

namespace CacloukyLibrary.Services;

public class OllamaService
{
    private readonly HttpClient _http;
    private readonly string _model;

    public OllamaService(HttpClient http, IConfiguration config)
    {
        _http  = http;
        _model = config["Ollama:Model"] ?? "nomic-embed-text";

        var baseUrl = config["Ollama:BaseUrl"] ?? "http://localhost:11434";
        _http.BaseAddress    = new Uri(baseUrl);
        _http.Timeout        = TimeSpan.FromMinutes(2);
    }

    public async Task<float[]> GetEmbeddingAsync(string text)
    {
        var body    = JsonSerializer.Serialize(new { model = _model, input = text });
        var content = new StringContent(body, Encoding.UTF8, "application/json");
        var resp    = await _http.PostAsync("/api/embed", content);
        resp.EnsureSuccessStatusCode();

        var doc = JsonDocument.Parse(await resp.Content.ReadAsStringAsync());
        return doc.RootElement
            .GetProperty("embeddings")[0]
            .EnumerateArray()
            .Select(v => v.GetSingle())
            .ToArray();
    }
}
