# Caclouky Library

A church library management system with AI-powered sermon search.

## Tech Stack

| Layer      | Technology |
|------------|------------|
| API        | ASP.NET Core 8, Entity Framework Core, ASP.NET Identity |
| Web        | React 18 (Vite + TypeScript + MUI v5) |
| Mobile     | Expo (React Native + TypeScript) |
| Database   | SQL Server Express |
| Auth       | JWT Bearer tokens, role-based policies |
| Embeddings | [Ollama](https://ollama.com) — `nomic-embed-text` (local, free, no quota) |
| Chat/AI    | Google Gemini 2.5 Flash (answer generation only) |

## Features

- **Book catalog** — search, genre filter, cover art, pagination
- **Reservations** — members reserve books; admins mark ready and process checkout
- **Checkouts** — loan tracking with due dates and late fees
- **Member management** — admin can create/edit accounts with roles
- **Sermon document library** — upload PDFs, index for search
- **AI sermon search** — ask questions in plain English; answers come from the actual sermon text with cited sources
- **Mobile app** — Expo app with sermon search and account tab
- **Role-based access** — Admin, Minister, GeneralAssembly

## Project Structure

```
caclouky-library/
├── api/                        # ASP.NET Core 8 Web API
│   ├── Controllers/            # Auth, Books, Checkouts, Members, Reservations, Search, SermonDocs
│   ├── Models/                 # PdfDocument, PdfChunk, Book, etc.
│   ├── Services/
│   │   ├── OllamaService.cs    # Embedding generation (local, free, no quota)
│   │   ├── GeminiService.cs    # Chat answer generation only
│   │   ├── PdfIndexService.cs  # Extracts pages, chunks text, stores embeddings
│   │   └── SearchService.cs    # Cosine similarity retrieval + Gemini answer
│   ├── Data/                   # LibraryDbContext + EF migrations
│   └── appsettings.Example.json
├── web/caclouky-react/         # React + Vite web app
│   └── src/
│       ├── pages/
│       │   ├── catalog/        # BookList, BookDetail
│       │   ├── auth/           # Login, Register
│       │   ├── member/         # MyCheckouts, MyReservations
│       │   ├── search/         # SermonSearch (AI chat)
│       │   └── admin/          # Dashboard, ManageBooks, ManageCheckouts,
│       │                       # ManageReservations, ManageMembers, SermonDocs
│       ├── api/                # Axios client + all API calls
│       └── auth/               # AuthContext, ProtectedRoute
├── mobile/                     # Expo React Native app
│   └── src/
│       ├── screens/
│       │   ├── LoginScreen.tsx
│       │   ├── SermonSearchScreen.tsx  # AI chat with tappable citations
│       │   ├── PdfViewerScreen.tsx     # Shows sermon page text from DB
│       │   └── AccountScreen.tsx
│       ├── api/                # Axios client (mirrors web)
│       ├── context/            # AuthContext (AsyncStorage for token persistence)
│       └── navigation/         # React Navigation stack + bottom tabs
└── docs/
```

## Roles

| Role             | What they can do |
|------------------|-----------------|
| `Admin`          | Everything — members, books, checkouts, sermon docs |
| `Minister`       | All books including restricted, manage checkouts/reservations |
| `GeneralAssembly`| Browse non-restricted books, reserve, view own checkouts |

## Local Development

### Prerequisites

- [.NET 8 SDK](https://dotnet.microsoft.com/download)
- [Node.js 20+](https://nodejs.org)
- [SQL Server Express](https://www.microsoft.com/en-us/sql-server/sql-server-downloads)
- [Ollama](https://ollama.com) — for sermon search embeddings (free, runs locally)

### 1. Start Ollama and pull the embedding model

```bash
ollama serve
ollama pull nomic-embed-text
```

Ollama runs at `http://localhost:11434` by default. `nomic-embed-text` is ~274 MB and runs on CPU — no GPU required.

### 2. API

```bash
cd api
cp appsettings.Example.json appsettings.json
# Edit appsettings.json:
#   - ConnectionStrings:DefaultConnection — your SQL Server instance
#   - Jwt:Key — any secret string, 32+ characters
#   - Gemini:ApiKey — from https://aistudio.google.com (free tier, used only for chat answers)
#   - Ollama settings default to http://localhost:11434 — no change needed for local dev

dotnet run
# API runs on http://localhost:5000
# EF Core migrations run automatically on first start
```

Default admin account (seeded on first run): `admin@caclouky.org` / `Admin123@`

### 3. Web app

```bash
cd web/caclouky-react
npm install
npm run dev
# Runs on http://localhost:4201
```

### 4. Mobile app (optional)

```bash
cd mobile
npm install
npx expo start        # scan QR with Expo Go on your phone
npm run web           # or preview in browser at http://localhost:8081
```

The mobile API URL defaults to `http://localhost:5000` in dev. On a physical device, update `DEV_API_URL` in `mobile/src/api/config.ts` to your machine's LAN IP (e.g. `http://192.168.1.10:5000`).

## How Sermon Search Works

1. **Upload** — Admin uploads sermon PDFs via the web app (Admin → Sermon Docs).
2. **Index** — The API extracts text page by page using PdfPig, splits into 500-word overlapping chunks, and generates a 768-dimension embedding for each chunk using Ollama (`nomic-embed-text`) locally. No internet required, no quota, no cost.
3. **Search** — A user asks a question. The question is embedded with the same Ollama model. Cosine similarity ranks all stored chunks. The top 5 most relevant chunks are passed to Gemini 2.5 Flash as context, which generates a grounded answer with source citations.
4. **Citations** — Each citation shows the sermon file name and page number. On mobile, tapping a citation loads the full page text directly from the database.

### Why Ollama for embeddings?

Gemini's free embedding quota is consumed quickly when indexing large PDF collections — one API call per 500-word chunk adds up fast. Embedding is a one-time bulk operation, so running it locally with Ollama costs nothing and has no rate limits. Gemini is reserved only for the chat/answer step — one call per user question — which fits comfortably within the free tier.

> **Important:** After switching from Gemini embeddings to Ollama, all previously indexed sermon PDFs must be re-indexed (the vector format changed). Go to **Admin → Sermon Docs → Index All**.

## API Reference

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/login` | Public | Login, returns JWT |
| POST | `/api/auth/register` | Public | Register new account |
| GET | `/api/books` | Public | Paginated book catalog |
| GET | `/api/books/{id}` | Public | Book detail |
| GET | `/api/books/genres` | Public | All genres |
| POST | `/api/books` | Admin/Minister | Create book |
| PUT | `/api/books/{id}` | Admin/Minister | Update book |
| DELETE | `/api/books/{id}` | Admin | Delete book |
| GET | `/api/checkouts` | Any role | All checkouts |
| POST | `/api/checkouts` | Admin/Minister | Check out a book |
| PUT | `/api/checkouts/{id}/return` | Admin/Minister | Return a book |
| GET | `/api/reservations` | Any role | All reservations |
| POST | `/api/reservations` | Any role | Reserve a book |
| PUT | `/api/reservations/{id}/cancel` | Any role | Cancel reservation |
| PUT | `/api/reservations/{id}/ready` | Admin/Minister | Mark ready for pickup |
| PUT | `/api/reservations/{id}/fulfill` | Admin/Minister | Complete checkout from reservation |
| GET | `/api/members` | Admin | All members |
| POST | `/api/members` | Admin | Create member |
| PUT | `/api/members/{id}` | Admin | Update member |
| PUT | `/api/members/{id}/deactivate` | Admin | Deactivate member |
| GET | `/api/sermon-docs` | Any role | List indexed sermon PDFs |
| POST | `/api/sermon-docs/upload` | Admin | Upload and index a PDF |
| POST | `/api/sermon-docs/index-all` | Admin | Queue all unindexed PDFs |
| GET | `/api/sermon-docs/index-status` | Admin | Live indexing progress |
| GET | `/api/sermon-docs/page/{fileName}/{page}` | Public | Raw page text from DB |
| POST | `/api/search/chat` | Public | AI question + grounded answer + citations |

## Configuration Reference

`api/appsettings.json` (gitignored — copy from `appsettings.Example.json`):

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost\\SQLEXPRESS;Database=CacloukyLibrary;Trusted_Connection=True;TrustServerCertificate=True;"
  },
  "Jwt": {
    "Key": "at-least-32-character-random-secret",
    "Issuer": "https://caclouky.org",
    "Audience": "https://caclouky.org",
    "ExpiryMinutes": 60
  },
  "AllowedOrigins": [
    "http://localhost:4201",
    "http://localhost:8081",
    "https://caclouky.org"
  ],
  "Gemini": {
    "ApiKey": "your-key-from-aistudio.google.com"
  },
  "Ollama": {
    "BaseUrl": "http://localhost:11434",
    "Model": "nomic-embed-text"
  },
  "SermonPdfs": {
    "StoragePath": "sermon-pdfs"
  }
}
```
