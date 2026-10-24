from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi import UploadFile, File, HTTPException
from extractor import extract_pdf
from pipeline import run_analysis

from fastapi import Depends, HTTPException
from auth import get_current_user
from database import get_database
from fastapi import Depends
from auth import get_current_user
from documents import router as documents_router

from runs import router as runs_router
from reviews import router as reviews_router


app = FastAPI(
    title="ReguLens AI",
    description="Scientific evidence integrity auditing API",
    version="0.1.0"
)

app.include_router(runs_router)

app.include_router(documents_router)

app.include_router(reviews_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"]
)


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "ReguLens AI Backend"
    }


@app.post("/analyze")
async def analyze(files: list[UploadFile] = File(...)):
    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded")

    extracted_pages = []

    for file in files:
        if not file.filename or not file.filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail="Only PDFs are supported")

        content = await file.read()

        try:
            extracted_pages.extend(extract_pdf(file.filename, content))
        except Exception:
            raise HTTPException(
                status_code=400,
                detail=f"Could not process PDF: {file.filename}"
            )

    results = run_analysis(extracted_pages)
    return {
        "status": "completed",
        "summary": {
            "documents_analyzed": len(files),
            "issues_found": len(results["findings"])
        },
        "findings": results["findings"],
        "claims": results["claims"],
    }

@app.get("/me")
def get_profile(
    user_id: str = Depends(get_current_user)
):
    return {
        "authenticated": True,
        "user_id": user_id
    }


@app.get("/db-check")
def check_database(
    user_id: str = Depends(get_current_user)
):
    db = get_database()

    result = (
        db.table("analysis_runs")
        .select("id")
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )

    return {
        "status": "connected",
        "database": "supabase"
    }



        
        