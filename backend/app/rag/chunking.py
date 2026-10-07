from pathlib import Path
from pypdf import PdfReader

def extract_text_from_pdf(pdf_path: str) -> list[dict]:
    """
    Extracts text page-by-page from a PDF document.
    Returns a list of dicts with page number and cleaned text.
    """
    path = Path(pdf_path)
    if not path.exists():
        raise FileNotFoundError(f"PDF file not found at: {pdf_path}")

    reader = PdfReader(str(path))
    extracted_pages = []

    for page_idx, page in enumerate(reader.pages):
        raw_text = page.extract_text() or ""
        cleaned_text = " ".join(raw_text.split())

        if cleaned_text:
            extracted_pages.append({
                "page_number": page_idx + 1,
                "text": cleaned_text
            })

    return extracted_pages


def _split_into_sentences(text: str) -> list[str]:
    """Splits text on common sentence terminators while preserving readable segments."""
    import re
    sentences = re.split(r'(?<=[.!?])\s+', text)
    return [s.strip() for s in sentences if s.strip()]


def chunk_text(pdf_pages: list[dict], chunk_size: int = 1000, overlap: int = 150) -> list[dict]:
    """
    Splits page-level text into sentence-aware overlapping chunks.
    Maintains clean grammatical boundaries and attaches source page numbers.
    """
    chunks = []
    chunk_id = 0

    for page in pdf_pages:
        text = page["text"]
        page_number = page["page_number"]

        sentences = _split_into_sentences(text)
        current_chunk: list[str] = []
        current_len = 0

        for sentence in sentences:
            sentence_len = len(sentence)

            # If adding this sentence exceeds chunk_size and we already have content
            if current_len + sentence_len > chunk_size and current_chunk:
                chunk_str = " ".join(current_chunk)
                chunks.append({
                    "chunk_id": chunk_id,
                    "page_number": page_number,
                    "text": chunk_str
                })
                chunk_id += 1

                # Retain overlap from end of current chunk
                overlap_chunk: list[str] = []
                overlap_len = 0
                for prev_sent in reversed(current_chunk):
                    if overlap_len + len(prev_sent) <= overlap:
                        overlap_chunk.insert(0, prev_sent)
                        overlap_len += len(prev_sent)
                    else:
                        break

                current_chunk = overlap_chunk
                current_len = overlap_len

            current_chunk.append(sentence)
            current_len += sentence_len

        # Append trailing sentence chunk for this page
        if current_chunk:
            chunk_str = " ".join(current_chunk)
            chunks.append({
                "chunk_id": chunk_id,
                "page_number": page_number,
                "text": chunk_str
            })
            chunk_id += 1

    return chunks