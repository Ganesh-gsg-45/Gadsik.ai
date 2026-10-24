import logging
from datetime import datetime, timezone
import zoneinfo
from google import genai
from google.genai import types
from ..config import settings

logger = logging.getLogger(__name__)
client = genai.Client(api_key=settings.GEMINI_API_KEY)

def get_current_time_context() -> str:
    try:
        now_ist = datetime.now(zoneinfo.ZoneInfo("Asia/Kolkata")).strftime("%A, %B %d, %Y at %I:%M %p %Z")
        now_utc = datetime.now(timezone.utc).strftime("%A, %B %d, %Y at %I:%M %p UTC")
        return f"{now_ist} ({now_utc})"
    except Exception:
        return datetime.now().strftime("%A, %B %d, %Y at %I:%M %p")

def generate_reply(prompt: str, system_instruction: str | None = None) -> tuple[str, int]:
    """
    Call Gemini (with automatic fallback to Groq on transient failure).
    Injects dynamic real-world time context so the model always knows the current date & time.
    Returns (reply_text, tokens_used).
    """
    time_ctx = get_current_time_context()
    base_system = (
        f"You are Gadsik.ai, an intelligent, modern AI assistant.\n"
        f"Current real-world date and time: {time_ctx}.\n"
        f"When asked about the current time, date, day of the week, or timezone, provide exact and accurate information using this timestamp."
    )
    if system_instruction:
        combined_instruction = f"{base_system}\n\n{system_instruction}"
    else:
        combined_instruction = base_system

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=combined_instruction,
            )
        )
        tokens_used = 0
        if response.usage_metadata:
            tokens_used = response.usage_metadata.total_token_count or 0

        reply_text = response.text or ""
        if not reply_text and response.candidates:
            reply_text = "I was unable to produce a response for this query due to safety filtering."

        return reply_text, tokens_used

    except Exception as e:
        logger.warning(f"Gemini API request failed: {e}. Attempting Groq fallback...")
        if getattr(settings, "GROQ_API_KEY", None):
            try:
                from .groq_client import generate_reply as groq_generate
                return groq_generate(prompt, system_instruction=combined_instruction)
            except Exception as groq_err:
                logger.error(f"Groq fallback failed: {groq_err}")
        raise e