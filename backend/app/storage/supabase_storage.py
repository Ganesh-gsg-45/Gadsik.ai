from supabase import create_client
from ..config import settings

supabase_admin = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)

BUCKET_NAME = "documents"

def upload_file(user_id: str, document_id: str, filename: str, file_bytes: bytes) -> str:
    """
    Uploads file bytes to Supabase Storage under a user-isolated path.
    Returns the storage path (not a public URL, since bucket is private).
    """
    path = f"{user_id}/{document_id}/{filename}"
    supabase_admin.storage.from_(BUCKET_NAME).upload(
        path,
        file_bytes,
        file_options={"content-type": "application/pdf"}
    )
    return path