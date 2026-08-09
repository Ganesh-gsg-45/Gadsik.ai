import tempfile
import os
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from ..auth.dependencies import get_current_user
from ..db.connection import get_pool
from ..db import documents as doc_repo
from ..schemas.document import DocumentOut
from ..storage.supabase_storage import upload_file
from ..rag.chunking import extract_text_from_pdf, chunk_text
from ..rag.embeddings import embed_texts
from ..rag.chroma_store import store_chunks

router = APIRouter(prefix="/documents", tags=["documents"])

@router.post("/upload-test", response_model=DocumentOut)
async def upload_test(
    conversation_id: str = Form(...),
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user),
):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(400, "Only PDF files are supported right now")

    pool = get_pool()
    contents = await file.read()

    doc = await doc_repo.create_document(
        pool, user_id, conversation_id, file.filename, storage_path="pending"
    )
    document_id = str(doc["id"])

    # Upload to Supabase Storage
    storage_path = upload_file(user_id, document_id, file.filename, contents)
    await pool.execute(
        "UPDATE documents SET storage_path = $2 WHERE id = $1",
        doc["id"], storage_path
    )

    await doc_repo.update_document_status(pool, doc["id"], "processing")

    try:
        # Write to a temp file since pypdf needs a file path/stream
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
            tmp.write(contents)
            tmp_path = tmp.name

        pages = extract_text_from_pdf(tmp_path)
        chunks = chunk_text(pages)

        texts = [c["text"] for c in chunks]
        embeddings = embed_texts(texts)

        # Use document_id as the collection name - isolates each document's chunks
        chunk_count = store_chunks(document_id, chunks, embeddings)

        await doc_repo.update_document_status(pool, doc["id"], "ready")
        print(f"✓ Document {document_id} ready with {chunk_count} chunks")

    except Exception as e:
        await doc_repo.update_document_status(pool, doc["id"], "failed", error_message=str(e))
        print(f"✗ Document {document_id} failed: {e}")
        raise HTTPException(500, f"Document processing failed: {e}")

    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

    doc["storage_path"] = storage_path
    doc["status"] = "ready"
    return doc