# Proposal: AI-Powered Sermon Search for Caclouky Library

**Prepared by:** Caclouky Library Development Team  
**Date:** April 2026  
**Status:** Awaiting Approval

---

## 1. Problem Statement

The library currently holds a collection of sermon and teaching materials in PDF format. These documents contain valuable theological content from ministers such as Bro. Sowders, but are **not searchable in any meaningful way**. A user who wants to know what was taught on a specific topic must manually open and read through each document — a time-consuming process that discourages use of the material.

---

## 2. Proposed Solution

Add an **AI-powered chat search** feature to the Caclouky Library web app. A member can type a natural language question such as:

> *"What did Bro. Sowders teach about long hair?"*

The system reads the relevant portions of the sermon PDFs and returns a conversational answer — in plain English — with **citations showing exactly which document and page the answer came from**.

This is not a simple keyword search. The AI understands the *meaning* of the question and can find relevant content even when the exact words don't match.

---

## 3. How It Works (Non-Technical Summary)

The system works in three stages:

### Stage 1 — Indexing (one-time setup, done by admin)
1. PDF documents are uploaded to the library server.
2. The text is extracted from each PDF and split into small sections (chunks).
3. Each chunk is converted into a mathematical "fingerprint" of its meaning — called an **embedding** — using OpenAI's API.
4. The chunks and their fingerprints are stored in the library's existing database.

### Stage 2 — Searching (every time a user asks a question)
1. The user's question is converted into its own fingerprint.
2. The system finds the chunks whose fingerprints are closest in meaning to the question.
3. The top matching chunks are retrieved from the database.

### Stage 3 — Answering
1. The matching chunks (the raw source material) are sent to the Claude AI along with the user's question.
2. Claude reads the source material and writes a clear, natural answer.
3. The answer is returned to the user along with the references (document name and page number) it drew from.

---

## 4. Technical Architecture

```
User (Browser)
     │
     │  "What did Bro. Sowders teach about long hair?"
     ▼
Angular Web App (caclouky.org)
     │
     │  POST /api/search/chat
     ▼
ASP.NET Core API (caclouky.org:8080)
     │
     ├─► OpenAI Embeddings API
     │       Convert question → numeric vector
     │
     ├─► SQL Server Database
     │       Find top 5 most semantically similar chunks
     │
     └─► Anthropic Claude API
             Send: question + relevant chunks
             Receive: natural language answer + citations
                         │
                         ▼
                  Response sent to user
```

### Components

| Component | Technology | Purpose |
|---|---|---|
| Web frontend | Angular 18 (existing) | Chat UI, document management |
| API backend | ASP.NET Core 9 (existing) | Business logic, RAG pipeline |
| Database | SQL Server Express (existing) | Store PDF chunks + embeddings |
| PDF text extraction | PdfPig (.NET library, free) | Extract text from PDF files |
| Embedding generation | OpenAI API | Convert text → searchable vectors |
| Answer generation | Anthropic Claude API | Generate natural language answers |

### New Database Tables

**`PdfDocuments`** — tracks each PDF file  
Fields: Id, Title, Author, FileName, PageCount, UploadedAt, IsIndexed

**`PdfChunks`** — stores extracted text sections with their AI fingerprints  
Fields: Id, DocumentId, PageNumber, ChunkIndex, Content, Embedding (vector)

---

## 5. Cost Analysis

### One-Time Costs: Indexing the PDF Collection

The cost to index depends on the total size of the PDF collection. The table below covers a range of collection sizes.

| Collection Size | Est. Pages | Indexing Cost |
|---|---|---|
| 25 PDFs (avg. 50 pages each) | ~1,250 pages | **< $0.03** |
| 50 PDFs (avg. 100 pages each) | ~5,000 pages | **< $0.07** |
| 200 PDFs (avg. 100 pages each) | ~20,000 pages | **< $0.27** |

> Indexing is a **one-time cost**. New documents added later cost only their proportional share.

---

### Ongoing Monthly Costs: User Queries

Each time a member asks a question, the system makes two API calls: one small call to embed the question (OpenAI), and one call to generate the answer (Claude).

**Cost per query: approximately $0.01 – $0.02**

| Monthly Usage | Estimated Monthly Cost |
|---|---|
| 100 questions/month | **~$1.50** |
| 500 questions/month | **~$7.50** |
| 1,000 questions/month | **~$15.00** |
| 2,000 questions/month | **~$30.00** |

> These are generous estimates. Actual cost may be lower depending on answer length.

---

### API Pricing Reference

| Service | Model | Rate |
|---|---|---|
| OpenAI | text-embedding-3-small | $0.020 per 1 million tokens |
| Anthropic | Claude Sonnet | $3.00 per 1M input tokens / $15.00 per 1M output tokens |

Both services are **pay-as-you-go** with no monthly minimums or subscriptions. Usage can be monitored and capped at any time via their respective dashboards.

---

### Total Estimated First-Year Cost

| Item | Cost |
|---|---|
| One-time indexing (50 PDFs) | ~$0.07 |
| Monthly queries (500/mo × 12 months) | ~$90.00 |
| **Total first year** | **~$90** |

This is a conservative estimate assuming moderate usage. For a small community library, actual usage will likely be lower.

---

## 6. Benefits

- **Increases the value of existing materials** — sermons and teachings that are hard to find become instantly accessible.
- **Saves time** — members get answers in seconds instead of reading through stacks of PDFs manually.
- **Cites its sources** — every answer shows exactly which document and page it came from, so members can read the original in full.
- **Natural language** — no need to know the exact title, author, or keywords. Ask a question the way you'd ask a person.
- **Secure** — search is only available to logged-in library members. Admin controls who can access it.
- **Low risk** — costs are marginal and usage can be monitored and capped. No long-term contracts.

---

## 7. Implementation Plan

| Phase | Work | Status |
|---|---|---|
| 1 | API keys obtained (OpenAI + Anthropic) | Pending approval |
| 2 | Database schema + PDF indexing pipeline | Ready to build |
| 3 | Chat API endpoint (RAG pipeline) | Ready to build |
| 4 | Angular chat UI | Ready to build |
| 5 | Admin PDF upload & management page | Ready to build |
| 6 | Testing & deployment | Ready to build |

Development is ready to begin immediately upon API key approval.

---

## 8. What We Are Asking For

1. **Approval to create accounts** on OpenAI (platform.openai.com) and Anthropic (console.anthropic.com)
2. **A monthly budget of $15–$30** to cover API usage (covers up to ~1,500 queries/month)
3. **A one-time budget of < $1** to index the existing PDF collection

---

## 9. Alternatives Considered

| Option | Pros | Cons |
|---|---|---|
| **This proposal (RAG + AI)** | Understands meaning, natural answers, cites sources | Small ongoing API cost |
| Keyword search only | Free, no external APIs | Misses conceptual matches, no natural language |
| Manual reading | No cost | Not scalable, defeats the purpose |
| Self-hosted AI model | No API costs | Requires dedicated GPU server ($100s/month), complex to maintain |

The RAG approach with hosted APIs is the best balance of capability, cost, and maintainability for a library of this size.

---

*For questions about this proposal, contact the Caclouky Library development team.*
