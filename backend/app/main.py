from fastapi import FastAPI, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import httpx
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from .auth.dependencies import get_current_user
from .db.connection import connect_db, disconnect_db, get_pool
from .routers import conversations, documents
from .rag.embeddings import get_embedding_model

from .llm.gemini_client import generate_reply


from .limiter import limiter

import asyncio
import threading
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    # Pre-warm embedding model in a background thread to prevent blocking server startup.
    threading.Thread(target=get_embedding_model, daemon=True).start()
    yield
    await disconnect_db()

app = FastAPI(title="Gadsik.ai API", lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@app.exception_handler(httpx.ConnectError)
async def db_connect_error_handler(request: Request, exc: httpx.ConnectError):
    return JSONResponse(
        status_code=503,
        content={
            "detail": "Database is unreachable. Your Supabase project may be PAUSED due to inactivity. Please open https://supabase.com/dashboard and click 'Restore project'."
        }
    )

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response

app.include_router(conversations.router)
app.include_router(documents.router)

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "gadsik.ai"}

@app.get("/health/db")
async def health_check_db():
    try:
        client = get_pool()
        await asyncio.to_thread(lambda: client.table("conversations").select("id").limit(1).execute())
        return {"db_status": "ok", "result": 1}
    except Exception as e:
        return {"db_status": "error", "error": str(e)}

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