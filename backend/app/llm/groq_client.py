from groq import Groq
from ..config import settings

client = Groq(api_key=settings.GROQ_API_KEY)

def generate_reply(prompt: str, model: str = "llama3-8b-8192", system_instruction: str | None = None) -> tuple[str, int]:
    """
    Call Groq API for ultra-fast response times with optional system instruction.
    Returns (reply_text, tokens_used).
    """
    messages = []
    if system_instruction:
        messages.append({"role": "system", "content": system_instruction})
    messages.append({"role": "user", "content": prompt})

    response = client.chat.completions.create(
        model=model,
        messages=messages,
    )
    reply_text = response.choices[0].message.content or ""
    tokens_used = response.usage.total_tokens if response.usage else 0
    return reply_text, tokens_used
