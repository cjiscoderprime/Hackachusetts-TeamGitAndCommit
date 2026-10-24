
import uuid
from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from auth import get_current_user
from database import get_database

router = APIRouter()

ReviewStatus = Literal[
    "unreviewed",
    "reviewed",
    "needs_clarification"
]


class ReviewUpdate(BaseModel):
    status: ReviewStatus
    note: str = Field(default="", max_length=5000)


def check_finding_access(finding_id: str, user_id: str):
    db = get_database()

    finding = (
        db.table("findings")
        .select("id,run_id")
        .eq("id", finding_id)
        .limit(1)
        .execute()
    )

    if not finding.data:
        raise HTTPException(404, "Finding not found")

    run = (
        db.table("analysis_runs")
        .select("id")
        .eq("id", finding.data[0]["run_id"])
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )

    if not run.data:
        raise HTTPException(404, "Finding not found")


@router.get("/findings/{finding_id}/review")
def get_review(
    finding_id: uuid.UUID,
    user_id: str = Depends(get_current_user)
):
    db = get_database()
    fid = str(finding_id)

    check_finding_access(fid, user_id)

    result = (
        db.table("finding_reviews")
        .select("status,note,updated_at")
        .eq("finding_id", fid)
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )

    if result.data:
        return {
            "finding_id": fid,
            **result.data[0]
        }

    return {
        "finding_id": fid,
        "status": "unreviewed",
        "note": "",
        "updated_at": None
    }


@router.patch("/findings/{finding_id}/review")
def update_review(
    finding_id: uuid.UUID,
    update: ReviewUpdate,
    user_id: str = Depends(get_current_user)
):
    db = get_database()
    fid = str(finding_id)

    check_finding_access(fid, user_id)

    updated_at = datetime.now(timezone.utc).isoformat()

    result = (
        db.table("finding_reviews")
        .upsert(
            {
                "finding_id": fid,
                "user_id": user_id,
                "status": update.status,
                "note": update.note,
                "updated_at": updated_at
            },
            on_conflict="finding_id,user_id"
        )
        .execute()
    )

    if not result.data:
        raise HTTPException(500, "Could not save review")

    return {
        "finding_id": fid,
        "status": update.status,
        "note": update.note,
        "updated_at": updated_at
    }
