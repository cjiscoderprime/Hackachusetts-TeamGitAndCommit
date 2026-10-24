
import uuid

from fastapi import APIRouter, Depends, HTTPException
from auth import get_current_user
from database import get_database
from storage import get_document_url

router = APIRouter()


@router.get("/documents/{document_id}/source")
def get_source(
    document_id: uuid.UUID,
    user_id: str = Depends(get_current_user)
):
    db = get_database()

    result = (
        db.table("documents")
        .select("id,run_id,filename,storage_path")
        .eq("id", str(document_id))
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )

    if not result.data:
        raise HTTPException(
            status_code=404,
            detail="Document not found"
        )

    document = result.data[0]

    # Confirm ownership of the parent run as well.
    run = (
        db.table("analysis_runs")
        .select("id")
        .eq("id", document["run_id"])
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )

    if not run.data:
        raise HTTPException(
            status_code=404,
            detail="Document not found"
        )

    url = get_document_url(document["storage_path"])

    return {
        "document_id": document["id"],
        "filename": document["filename"],
        "url": url,
        "expires_in": 60
    }
