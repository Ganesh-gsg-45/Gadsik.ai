import hashlib
from fastapi import Request
from slowapi import Limiter

def _get_user_id_for_limiter(request: Request) -> str:
    """
    Key function for slowapi: rate-limit by authenticated user_id, not by IP.
    Falls back to client IP (respecting X-Forwarded-For if behind a proxy) for unauthenticated requests.
    """
    auth = request.headers.get("authorization", "")
    if auth.startswith("Bearer "):
        token = auth.removeprefix("Bearer ").strip()
        return hashlib.sha256(token.encode()).hexdigest()[:16]

    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()

    return request.client.host if request.client else "unknown"

limiter = Limiter(key_func=_get_user_id_for_limiter)
