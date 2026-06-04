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

    public async Task<string> GetAnswerAsync(string question, IEnumerable<string> contextChunks, string? topicIndex = null)
    {
        var context = string.Join("\n\n---\n\n", contextChunks);

        var topicSection = topicIndex is { Length: > 0 }
            ? $"""

            COMPLETE INDEX OF TOPICS/DOCTRINES COVERED IN THE SOURCE MATERIAL:
            (Use this list to give comprehensive answers — especially when asked to list, summarize, or enumerate topics)
            {topicIndex}

            """
            : "";

        var prompt = $"""
            You are a helpful assistant specializing in the teachings of Brother William Sowders (also called "Bro. Sowders").
            The source material below consists of Gospel of the Kingdom sermon transcripts where Brother William Sowders is the primary teacher.
            Other names (e.g. "Brother Tommy", "Brother Guthrie") are congregation members, NOT the main teacher.

            Your task:
            - Answer based ONLY on what Brother William Sowders himself taught in the source material.
            - When asked to LIST or ENUMERATE topics, doctrines, or teachings — use the COMPLETE INDEX below to give a thorough, comprehensive answer. Do NOT limit yourself to only the excerpt passages.
            - Be thorough. For list questions, include every relevant item from the index.
            - Quote directly from the excerpts when it strengthens the answer.
            - After your answer, add "SCRIPTURES:" followed by Bible references mentioned (one per line). If none, write "SCRIPTURES: none".
            {topicSection}
            RELEVANT EXCERPTS:
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
