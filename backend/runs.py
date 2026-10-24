import logging
import uuid
from datetime import datetime, timezone

from fastapi import (
    APIRouter, BackgroundTasks, Depends,
    File, HTTPException, UploadFile
)
from google.genai.errors import ServerError

from auth import get_current_user
from database import get_database
from storage import upload_document
from extractor import extract_pdf
from pipeline import run_analysis

router = APIRouter()
logger = logging.getLogger(__name__)

MAX_PDF_BYTES = 5 * 1024 * 1024


def now():
    return datetime.now(timezone.utc).isoformat()


def update_run(run_id, **fields):
    get_database().table("analysis_runs").update(
        fields
    ).eq("id", run_id).execute()


def attach_source_document_ids(findings, uploaded):
    """Associate finding sources with their original PDFs."""
    filename_to_ids = {}

    for document_id, filename, _ in uploaded:
        filename_to_ids.setdefault(filename, []).append(document_id)

    for finding in findings:
        for source in finding.get("sources", []):
            if source.get("document_id"):
                continue

            filename = source.get("document")
            matching_ids = filename_to_ids.get(filename, [])

            if len(matching_ids) == 1:
                source["document_id"] = matching_ids[0]

    return findings


def process_run(run_id, uploaded):
    db = get_database()
    extracted_pages = []
    extraction_errors = 0

    try:
        update_run(
            run_id,
            status="extracting",
            started_at=now()
        )

        # Step 1: Extract document contents
        for document_id, filename, content in uploaded:
            try:
                db.table("documents").update({
                    "status": "extracting"
                }).eq("id", document_id).execute()

                pages = extract_pdf(filename, content)

                if not any(
                    page.get("text", "").strip()
                    for page in pages
                ):
                    raise ValueError("No extractable text in PDF")

                for page in pages:
                    page["document_id"] = document_id

                extracted_pages.extend(pages)

                db.table("documents").update({
                    "status": "completed",
                    "error_message": None
                }).eq("id", document_id).execute()

            except Exception as exc:
                extraction_errors += 1
                logger.warning(
                    "PDF extraction failed for %s: %s",
                    filename,
                    exc
                )

                db.table("documents").update({
                    "status": "failed",
                    "error_message": str(exc)[:300]
                }).eq("id", document_id).execute()

        if not extracted_pages:
            update_run(
                run_id,
                status="failed",
                error_message="No PDFs could be extracted",
                completed_at=now()
            )
            return

        # Step 2: Run AI analysis
        update_run(run_id, status="analyzing")

        results = run_analysis(extracted_pages)

        # Step 3: Retrieve findings and attach document IDs
        findings = results.get("findings", [])
        findings = attach_source_document_ids(
            findings, uploaded
        )

        # Step 4: Persist scientific findings
        for finding in findings:
            db.table("findings").insert({
                "run_id": run_id,
                "category": finding["category"],
                "severity": finding["severity"],
                "title": finding["title"],
                "description": finding["description"],
                "sources": finding.get("sources", []),
                "recommendation": finding.get("recommendation")
            }).execute()

        # Step 5: Record actual analysis method
        method = results.get(
            "analysis_method",
            "gemini_extraction_only"
        )

        verification_complete = (
            method != "gemini_extraction_only"
        )

        fallback_used = results.get("fallback_used", False)

        final_status = (
            "completed"
            if extraction_errors == 0 and verification_complete
            else "partial"
        )

        update_run(
            run_id,
            status=final_status,
            analysis_method=method,
            fallback_used=(
                fallback_used or not verification_complete
            ),
            fallback_reason=(
                results.get("fallback_reason")
                or (
                    "Scientific verification not yet integrated"
                    if not verification_complete
                    else None
                )
            ),
            completed_at=now()
        )

    # Handle Gemini service errors
    except ServerError as exc:
        logger.exception(
            "Gemini service failed for run %s",
            run_id
        )

        try:
            update_run(
                run_id,
                status="failed",
                fallback_used=False,
                error_message=(
                    "AI provider temporarily unavailable (503)"
                    if getattr(exc, "code", None) == 503
                    else "AI provider request failed"
                ),
                completed_at=now()
            )
        except Exception:
            logger.exception(
                "Could not save Gemini failure for %s",
                run_id
            )

    # Handle other processing errors
    except Exception:
        logger.exception(
            "Run processing failed: %s",
            run_id
        )

        try:
            update_run(
                run_id,
                status="failed",
                error_message="Analysis processing failed",
                completed_at=now()
            )
        except Exception:
            logger.exception(
                "Could not persist failed run status"
            )


@router.post("/runs", status_code=202)
async def create_run(
    background_tasks: BackgroundTasks,
    files: list[UploadFile] = File(...),
    user_id: str = Depends(get_current_user)
):
    if not 1 <= len(files) <= 5:
        raise HTTPException(
            status_code=400,
            detail="Upload between 1 and 5 PDFs"
        )

    db = get_database()
    run_id = str(uuid.uuid4())
    uploaded = []

    # Validate uploads before creating the run
    for file in files:
        if (
            not file.filename
            or not file.filename.lower().endswith(".pdf")
        ):
            raise HTTPException(
                status_code=400,
                detail="PDF files only"
            )

        content = await file.read(MAX_PDF_BYTES + 1)

        if len(content) > MAX_PDF_BYTES:
            raise HTTPException(
                status_code=413,
                detail="Maximum 5 MB per PDF"
            )

        if not content.startswith(b"%PDF-"):
            raise HTTPException(
                status_code=400,
                detail="Invalid PDF format"
            )

        uploaded.append((file.filename, content))

    # Create persistent analysis record
    db.table("analysis_runs").insert({
        "id": run_id,
        "user_id": user_id,
        "status": "queued"
    }).execute()

    jobs = []

    # Store the PDFs privately
    try:
        for filename, content in uploaded:
            document_id = str(uuid.uuid4())

            path = upload_document(
                user_id, run_id, content
            )

            db.table("documents").insert({
                "id": document_id,
                "run_id": run_id,
                "user_id": user_id,
                "filename": filename,
                "storage_path": path,
                "status": "queued"
            }).execute()

            jobs.append((
                document_id,
                filename,
                content
            ))

    except Exception:
        logger.exception(
            "Document storage failed for run %s",
            run_id
        )

        update_run(
            run_id,
            status="failed",
            error_message="Document storage failed",
            completed_at=now()
        )

        raise HTTPException(
            status_code=500,
            detail="Could not store uploaded documents"
        )

    # Execute analysis after returning the run ID
    background_tasks.add_task(
        process_run,
        run_id,
        jobs
    )

    return {
        "id": run_id,
        "status": "queued",
        "documents_uploaded": len(jobs)
    }


@router.get("/runs")
def list_runs(
    user_id: str = Depends(get_current_user)
):
    result = (
        get_database()
        .table("analysis_runs")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )

    return result.data


@router.get("/runs/{run_id}")
def get_run(
    run_id: uuid.UUID,
    user_id: str = Depends(get_current_user)
):
    db = get_database()

    run = (
        db.table("analysis_runs")
        .select("*")
        .eq("id", str(run_id))
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )

    if not run.data:
        raise HTTPException(
            status_code=404,
            detail="Run not found"
        )

    documents = (
        db.table("documents")
        .select("id,filename,status,error_message")
        .eq("run_id", str(run_id))
        .execute()
    ).data

    findings = (
        db.table("findings")
        .select("*")
        .eq("run_id", str(run_id))
        .execute()
    ).data

    return {
        **run.data[0],
        "documents": documents,
        "findings": findings,
        "summary": {
            "documents_analyzed": sum(
                d["status"] == "completed"
                for d in documents
            ),
            "issues_found": len(findings)
        }
    }
