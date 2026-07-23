import os
from pathlib import Path
from dotenv import load_dotenv

# Explicitly locate .env relative to this file, not the current working directory
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

class Settings:
    SUPABASE_JWT_SECRET: str = os.environ["SUPABASE_JWT_SECRET"]
    SUPABASE_URL: str = os.environ["SUPABASE_URL"]

settings = Settings()