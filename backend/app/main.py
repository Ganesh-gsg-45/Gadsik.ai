from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from .auth.dependencies import get_current_user
from .db.connection import connect_db, disconnect_db, get_pool
from .routers import conversations, documents

from .llm.gemini_client import generate_reply

app = FastAPI(title="Gadsik.ai API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(conversations.router)
app.include_router(documents.router)

@app.on_event("startup")
async def on_startup():
    await connect_db()

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
        reply = generate_reply("Say hello in one short sentence.")
        return {"reply": reply}
    except Exception as e:
        return {"error": str(e), "error_type": type(e).__name__}