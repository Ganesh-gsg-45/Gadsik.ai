from sentence_transformers import SentenceTransformer

_model = None

def get_embedding_model() -> SentenceTransformer:
    """
    Lazily loads the embedding model once and reuses it across calls.
    Loading it once is important - it's slow to load, fast to reuse.
    """
    global _model
    if _model is None:
        _model = SentenceTransformer("all-MiniLM-L6-v2")
    return _model


def embed_texts(texts: list[str]) -> list[list[float]]:
    """
    Embeds a batch of texts. Used for embedding all chunks of a document at once.
    """
    model = get_embedding_model()
    embeddings = model.encode(texts, show_progress_bar=False)
    return embeddings.tolist()


def embed_query(text: str) -> list[float]:
    """
    Embeds a single piece of text. Used for embedding a user's question at query time.
    """
    model = get_embedding_model()
    embedding = model.encode(text)
    return embedding.tolist()