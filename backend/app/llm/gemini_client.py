from google import genai
from ..config import settings

client = genai.Client(api_key=settings.GEMINI_API_KEY)

def generate_reply(prompt: str) -> str:
    response = client.models.generate_content(
        model="gemini-flash-latest",
        contents=prompt,
    )
    return response.text