using System.Text;
using System.Text.Json;

namespace CacloukyLibrary.Services;

public class OllamaService
{
    private readonly HttpClient _http;
    private readonly string _embedModel;
    private readonly string _chatModel;

    public OllamaService(HttpClient http, IConfiguration config)
    {
        _http       = http;
        _embedModel = config["Ollama:Model"]     ?? "nomic-embed-text";
        _chatModel  = config["Ollama:ChatModel"] ?? "llama3.2";

        var baseUrl = config["Ollama:BaseUrl"] ?? "http://localhost:11434";
        _http.BaseAddress = new Uri(baseUrl);
        _http.Timeout     = TimeSpan.FromSeconds(90);
    }

    public async Task<float[]> GetEmbeddingAsync(string text)
    {
        var body    = JsonSerializer.Serialize(new { model = _embedModel, input = text });
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

    public async Task<string> GetAnswerAsync(string question, IEnumerable<string> contextChunks)
    {
        var context = string.Join("\n\n---\n\n", contextChunks);

        var prompt = $"""
            You are a helpful assistant specializing in the teachings of Brother William Sowders (also called "Bro. Sowders").
            The source material below consists of sermon transcripts where Brother William Sowders is the primary teacher and preacher.
            Other names that appear in the transcripts (such as "Brother Tommy", "Brother [any name]", etc.) are congregation members, assistants, or audience participants — NOT the main teacher.

            Your task:
            - Answer based ONLY on what Brother William Sowders himself taught or preached in the source material.
            - Do NOT attribute teachings to other named individuals in the transcripts.
            - If the source material does not contain Bro. Sowders' teaching on the topic, say so clearly — do not guess or invent.
            - Be thorough but concise. Quote directly from the source when it strengthens the answer.

            SOURCE MATERIAL:
            {context}

            QUESTION:
            {question}
            """;

        var body = JsonSerializer.Serialize(new
        {
            model    = _chatModel,
            messages = new[] { new { role = "user", content = prompt } },
            stream   = false
        });

        var content = new StringContent(body, Encoding.UTF8, "application/json");
        var resp    = await _http.PostAsync("/api/chat", content);
        resp.EnsureSuccessStatusCode();

        var doc = JsonDocument.Parse(await resp.Content.ReadAsStringAsync());
        return doc.RootElement
            .GetProperty("message")
            .GetProperty("content")
            .GetString() ?? "";
    }
}
