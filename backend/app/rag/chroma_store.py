import chromadb
from ..config import settings

_client = None

def get_chroma_client() -> chromadb.PersistentClient:
    global _client
    if _client is None:
        _client = chromadb.PersistentClient(path=settings.CHROMA_PATH)
    return _client


def get_or_create_collection(collection_name: str):
    client = get_chroma_client()
    return client.get_or_create_collection(name=collection_name)


def store_chunks(collection_name: str, chunks: list[dict], embeddings: list[list[float]]):
    """
    Stores chunks + their embeddings in a Chroma collection.
    """
    collection = get_or_create_collection(collection_name)

    ids = [str(chunk["chunk_id"]) for chunk in chunks]
    texts = [chunk["text"] for chunk in chunks]
    metadatas = [{"page_number": chunk["page_number"]} for chunk in chunks]

    collection.add(
        ids=ids,
        embeddings=embeddings,
        documents=texts,
        metadatas=metadatas
    )

    return collection.count()


def query_collection(collection_name: str, query_embedding: list[float], top_k: int = 5) -> list[dict]:
    """
    Given a query embedding, returns the top_k most relevant chunks.
    """
    collection = get_or_create_collection(collection_name)

    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=top_k
    )

    retrieved = []
    for i in range(len(results["ids"][0])):
        retrieved.append({
            "chunk_id": results["ids"][0][i],
            "text": results["documents"][0][i],
            "page_number": results["metadatas"][0][i]["page_number"],
            "distance": results["distances"][0][i]
        })
    return retrieved