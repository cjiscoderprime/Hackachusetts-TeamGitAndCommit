
import uuid
from database import get_database

BUCKET = "regulens-documents"


def upload_document(
    user_id: str,
    run_id: str,
    content: bytes
) -> str:
    """Store an uploaded PDF and return its private path."""

    document_id = str(uuid.uuid4())
    path = f"{user_id}/{run_id}/{document_id}.pdf"

    db = get_database()

    db.storage.from_(BUCKET).upload(
        path=path,
        file=content,
        file_options={
            "content-type": "application/pdf",
            "upsert": "false"
        }
    )

    return path


def get_document_url(storage_path: str) -> str:
    """Return a temporary URL for a stored PDF."""

    db = get_database()

    result = db.storage.from_(BUCKET).create_signed_url(
        storage_path,
        60
    )

    return result["signedURL"]
