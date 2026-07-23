from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from .auth.dependencies import get_current_user


app = FastAPI(title="Gadsik.ai API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "gadsik.ai"}

@app.get("/me")
def read_current_user(user_id: str = Depends(get_current_user)):
    return {"user_id": user_id}