import tempfile
import os
from fastapi import APIRouter, BackgroundTasks, Depends, Request, UploadFile, File, Form, HTTPException, Query
from pydantic import BaseModel
from ..auth.dependencies import get_current_user
from ..db.connection import get_pool
from ..db import documents as doc_repo
from ..schemas.document import DocumentOut
from ..storage.supabase_storage import upload_file
from ..rag.chunking import extract_text_from_pdf, chunk_text
from ..rag.embeddings import embed_texts, embed_query
from ..rag.chroma_store import store_chunks, query_collection, get_all_chunks
from ..llm.gemini_client import generate_reply
from ..db.usage import log_usage_event

router = APIRouter(prefix="/documents", tags=["documents"])


# ── Background worker ─────────────────────────────────────────────────────────

async def _process_document(pool, document_id: str, tmp_path: str, contents: bytes):
    """
    Runs PDF → chunk → embed → ChromaDB pipeline in the background.
    The HTTP response has already been sent by the time this runs.
    """
    try:
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
            tmp.write(contents)
            tmp_path = tmp.name

        pages = extract_text_from_pdf(tmp_path)
        chunks = chunk_text(pages)

        texts = [c["text"] for c in chunks]
        embeddings = embed_texts(texts)

        chunk_count = store_chunks(document_id, chunks, embeddings)

        full_text = "\n\n".join(
            f"[Page {p['page_number']}]: {p['text']}" for p in pages
        )

        await pool.execute(
            "UPDATE documents SET chroma_collection_id = $2, full_text = $3 WHERE id = $1",
            document_id, document_id, full_text
        )
        await doc_repo.update_document_status(pool, document_id, "ready")
        print(f"✓ Document {document_id} ready with {chunk_count} chunks")

    except Exception as e:
        await doc_repo.update_document_status(pool, document_id, "failed", error_message=str(e))
        print(f"✗ Document {document_id} failed: {e}")

    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)


# ── Upload ────────────────────────────────────────────────────────────────────

@router.post("/upload", response_model=DocumentOut, status_code=202)
async def upload_document(
    request: Request,
    background_tasks: BackgroundTasks,
    conversation_id: str = Form(...),
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user),
):
    """
    Upload a PDF. Returns immediately with status='processing'.
    Poll GET /documents/{id} until status becomes 'ready' or 'failed'.
    """
    if not file.filename.endswith(".pdf"):
        raise HTTPException(400, "Only PDF files are supported right now")

    pool = get_pool()
    contents = await file.read()

    doc = await doc_repo.create_document(
        pool, user_id, conversation_id, file.filename, storage_path="pending"
    )
    document_id = str(doc["id"])

    storage_path = upload_file(user_id, document_id, file.filename, contents)
    await pool.execute(
        "UPDATE documents SET storage_path = $2 WHERE id = $1",
        doc["id"], storage_path
    )
    await doc_repo.update_document_status(pool, doc["id"], "processing")

    # Queue processing — returns to caller immediately
    background_tasks.add_task(_process_document, pool, document_id, None, contents)

    doc["storage_path"] = storage_path
    doc["status"] = "processing"
    return doc


# ── List documents for a conversation ────────────────────────────────────

@router.get("", response_model=list[DocumentOut])
async def list_documents(
    conversation_id: str = Query(..., description="Filter by conversation"),
    user_id: str = Depends(get_current_user),
):
    """Return all documents uploaded to a specific conversation."""
    pool = get_pool()
    return await doc_repo.list_documents_by_conversation(pool, conversation_id, user_id)


# ── Get single document (for status polling) ─────────────────────────────

@router.get("/{document_id}", response_model=DocumentOut)
async def get_document(
    document_id: str,
    user_id: str = Depends(get_current_user),
):
    """Get document metadata and current processing status."""
    pool = get_pool()
    doc = await doc_repo.get_document(pool, document_id, user_id)
    if doc is None:
        raise HTTPException(404, "Document not found")
    return doc


# ── Retrieve chunks (semantic search query) ───────────────────────────────────

class RetrieveRequest(BaseModel):
    question: str
    top_k: int = 5


@router.post("/{document_id}/retrieve")
async def retrieve_from_document(
    document_id: str,
    body: RetrieveRequest,
    user_id: str = Depends(get_current_user),
):
    pool = get_pool()

    doc = await pool.fetchrow(
        "SELECT id, status, chroma_collection_id FROM documents WHERE id = $1 AND user_id = $2",
        document_id, user_id
    )
    if doc is None:
        raise HTTPException(404, "Document not found")
    if doc["status"] != "ready":
        raise HTTPException(400, f"Document is not ready yet (status: {doc['status']})")

    query_vec = embed_query(body.question)
    results = query_collection(doc["chroma_collection_id"] or document_id, query_vec, top_k=body.top_k)

    return {
        "question": body.question,
        "document_id": document_id,
        "results": results
    }


# ── Document Summary Endpoint ────────────────────────────────────────────────

@router.post("/{document_id}/summarize")
async def summarize_document(
    document_id: str,
    user_id: str = Depends(get_current_user),
):
    """Generates an executive overview and key topics summary for any document."""
    pool = get_pool()

    doc = await pool.fetchrow(
        "SELECT id, filename, status, full_text FROM documents WHERE id = $1 AND user_id = $2",
        document_id, user_id
    )
    if doc is None:
        raise HTTPException(404, "Document not found")
    if doc["status"] != "ready":
        raise HTTPException(400, f"Document is not ready yet (status: {doc['status']})")
    if not doc["full_text"]:
        raise HTTPException(400, "No extracted text available for this document")

    sample_text = doc["full_text"][:25000]

    prompt = f"""You are an advanced RAG Document Assistant.
Provide a clear, high-level structural overview and summary of this document.

Document Title: {doc['filename']}
Text Sample:
{sample_text}

Format your response in Markdown with:
1. Executive Summary (2-3 sentences)
2. Core Themes & Covered Topics (bullet points)
3. Target Audience / Intended Purpose
4. Key Terms / Concepts
"""

    summary_text, tokens_used = generate_reply(prompt)

    try:
        await log_usage_event(pool, user_id, "document_summary", tokens_used)
    except Exception:
        pass

    return {
        "document_id": document_id,
        "filename": doc["filename"],
        "summary": summary_text,
        "tokens_used": tokens_used
    }
