from google import genai
from ..config import settings

client = genai.Client(api_key=settings.GEMINI_API_KEY)

def generate_reply(prompt: str) -> tuple[str, int]:
    """
    Call Gemini and return (reply_text, tokens_used).
    tokens_used comes from the real usage_metadata in the response.
    """
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
    )
    tokens_used = 0
    if response.usage_metadata:
        tokens_used = response.usage_metadata.total_token_count or 0
    return response.text, tokens_used