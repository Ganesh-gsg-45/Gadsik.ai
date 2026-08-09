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


def chunk_text(pdf_pages: list[dict], chunk_size: int = 500, overlap: int = 50) -> list[dict]:
    """
    Splits page-level text into overlapping chunks.
    Each chunk retains a reference to its source page number.
    """
    chunks = []
    chunk_id = 0

    for page in pdf_pages:
        text = page["text"]
        page_number = page["page_number"]

        start = 0
        while start < len(text):
            end = start + chunk_size
            chunk_piece = text[start:end]

            chunks.append({
                "chunk_id": chunk_id,
                "page_number": page_number,
                "text": chunk_piece
            })
            chunk_id += 1
            start += chunk_size - overlap

    return chunks