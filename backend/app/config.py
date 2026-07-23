import os
from pathlib import Path
from dotenv import load_dotenv

env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

class Settings:
    SUPABASE_URL: str = os.environ["SUPABASE_URL"]
    DATABASE_URL: str = os.environ["DATABASE_URL"]

settings = Settings()