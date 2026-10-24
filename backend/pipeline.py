import logging
import time
import json

from agents import extract_claims
from verifier import verify_evidence

logger = logging.getLogger(__name__)


def run_analysis(extracted_pages: list[dict]) -> dict:
    start = time.perf_counter()

    logger.info("Starting scientific claim extraction")

    claims = extract_claims(extracted_pages)

    available_documents = sorted({
    page["document"]

    for page in extracted_pages
    })

    for claim in claims:
        if claim.get("kind") == "attachment_reference":
            claim["available_documents"] = available_documents

    print("\n========== EXTRACTED CLAIMS ==========")
    print("Total claims:", len(claims))
    print(json.dumps(claims, indent=2))
    print("======================================\n")

    logger.info(
        "Extracted %d claims in %.2f seconds",
        len(claims),
        time.perf_counter() - start
    )

    findings = verify_evidence(claims)

    logger.info(
        "Scientific verification identified %d findings",
        len(findings)
    )

    return {
        "claims": claims,
        "findings": findings,
        "analysis_method": "gemini_with_rules",
        "fallback_used": False,
        "fallback_reason": None
    }
