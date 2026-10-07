from groq import Groq
from ..config import settings

client = Groq(api_key=settings.GROQ_API_KEY)

def generate_reply(prompt: str, model: str = "llama-3.3-70b-versatile") -> tuple[str, int]:
    """
    Call Groq API for ultra-fast response times.
    Returns (reply_text, tokens_used).
    """
    response = client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
    )
    reply_text = response.choices[0].message.content or ""
    tokens_used = response.usage.total_tokens if response.usage else 0
    return reply_text, tokens_used
