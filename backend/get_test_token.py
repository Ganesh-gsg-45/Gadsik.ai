from supabase import create_client
import os
from dotenv import load_dotenv
from pathlib import Path

env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=env_path)

# You need the anon/public key for this (not the JWT secret) - get it from
# Supabase → Settings → API → Project API keys → anon public
SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_ANON_KEY = os.environ["SUPABASE_ANON_KEY"]

supabase = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

email = os.environ.get("TEST_USER_EMAIL")
password = os.environ.get("TEST_USER_PASSWORD")

if not email or not password:
    raise ValueError(
        "TEST_USER_EMAIL and TEST_USER_PASSWORD environment variables must be configured in backend/.env"
    )

# Try sign up first; if user already exists, sign in instead
try:
    res = supabase.auth.sign_up({"email": email, "password": password})
except Exception:
    res = None

if not res or not res.session:
    res = supabase.auth.sign_in_with_password({"email": email, "password": password})

if not res or not res.session:
    raise RuntimeError("Authentication failed. Please verify TEST_USER_EMAIL and TEST_USER_PASSWORD.")

print("\nACCESS TOKEN:\n")
print(res.session.access_token)