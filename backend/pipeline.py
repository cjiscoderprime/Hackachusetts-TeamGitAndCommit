from agents import extract_claims

def run_analysis(extracted_pages: list[dict]) -> dict:
    """Run AI extraction and prepare results for verification."""

    claims = extract_claims(extracted_pages)

    return {
        "claims": claims,
        "findings": []
    }
