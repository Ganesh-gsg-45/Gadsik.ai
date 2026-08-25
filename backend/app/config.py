import os
from pathlib import Path
from dotenv import load_dotenv

env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

# Absolute path to the chroma_db directory inside the backend folder.
# Using an absolute path prevents ChromaDB from creating the DB in whatever
# directory uvicorn happens to be launched from.
_BACKEND_DIR = Path(__file__).resolve().parent.parent

class Settings:
    SUPABASE_URL: str = os.environ["SUPABASE_URL"]
    DATABASE_URL: str = os.environ["DATABASE_URL"]
    GEMINI_API_KEY: str = os.environ["GEMINI_API_KEY"]
    SUPABASE_SERVICE_ROLE_KEY: str = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    SUPABASE_ANON_KEY: str = os.environ.get("SUPABASE_ANON_KEY", "")

    # Vector store — always resolved to an absolute path
    CHROMA_PATH: str = str(_BACKEND_DIR / "chroma_db")

settings = Settings()