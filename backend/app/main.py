from fastapi import FastAPI, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from .auth.dependencies import get_current_user
from .db.connection import connect_db, disconnect_db, get_pool
from .routers import conversations, documents
from .rag.embeddings import get_embedding_model

from .llm.gemini_client import generate_reply


def _get_user_id_for_limiter(request: Request) -> str:
    """
    Key function for slowapi: rate-limit by authenticated user_id, not by IP.
    Falls back to client IP if the auth header is missing (unauthenticated routes).
    """
    auth = request.headers.get("authorization", "")
    if auth.startswith("Bearer "):
        # We can't re-validate the JWT here cheaply, so we use the raw token as
        # a unique key.  The full validation still happens in get_current_user.
        return auth[7:20]  # first 13 chars of token — unique enough for keying
    return request.client.host


limiter = Limiter(key_func=_get_user_id_for_limiter)

app = FastAPI(title="Gadsik.ai API")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(conversations.router)
app.include_router(documents.router)

@app.on_event("startup")
async def on_startup():
    await connect_db()
    # Pre-warm embedding model in a background thread to prevent blocking server startup.
    # This avoids long connection hangs during startup/reloads when HuggingFace is slow.
    import threading
    threading.Thread(target=get_embedding_model, daemon=True).start()

@app.on_event("shutdown")
async def on_shutdown():
    await disconnect_db()

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "gadsik.ai"}

@app.get("/health/db")
async def health_check_db():
    pool = get_pool()
    result = await pool.fetchval("SELECT 1")
    return {"db_status": "ok", "result": result}

@app.get("/me")
def read_current_user(user_id: str = Depends(get_current_user)):
    return {"user_id": user_id}
    



@app.get("/test-gemini")
def test_gemini():
    try:
        reply, tokens = generate_reply("Say hello in one short sentence.")
        return {"reply": reply, "tokens_used": tokens}
    except Exception as e:
        return {"error": str(e), "error_type": type(e).__name__}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
        reload_excludes=["chroma_db/*", ".chroma_db/*", "*.sqlite3"],
    )