# Gadsik.ai — Intelligent Document RAG Assistant

A high-performance, citation-backed **Retrieval-Augmented Generation (RAG)** platform designed to parse, index, search, and answer complex questions from any document or technical PDF.

---

## 🚀 Key Features

- **Document Ingestion & Chunking**: Extract page-by-page text from PDFs with sentence-boundary aware recursive chunking.
- **Semantic Vector Embeddings**: Generate high-density vector embeddings using `SentenceTransformer (all-MiniLM-L6-v2)`.
- **ChromaDB Vector Store**: Fast persistent similarity retrieval with distance scoring.
- **Citation-Backed Generation**: Grounded generation via Gemini Flash / Groq LLMs providing explicit page citations `(Source: Page X)` for every answer.
- **Document Overview & Synthesizer**: Quick structured executive summaries of entire documents.
- **RAG Semantic Search Playground**: Interactive vector chunk inspector to verify retrieval precision directly from the UI.
- **Modern React & TypeScript UI**: Responsive dark/light interface with markdown rendering, LaTeX, and code syntax highlighting.

---

## 🛠 Tech Stack

- **Backend**: Python 3.11+, FastAPI, ChromaDB, Sentence-Transformers, PyPDF, asyncpg, Supabase (Auth & Storage)
- **LLM Engine**: Google Gemini Flash / Groq
- **Frontend**: React 18, TypeScript, Vite, React Markdown, Lucide Icons

---

## 🏃 Quick Start

### 1. Backend Setup
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r ../requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
