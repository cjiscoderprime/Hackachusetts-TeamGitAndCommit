
import json
import os

from dotenv import load_dotenv
from google import genai

load_dotenv()

client = None


def get_client():
    global client

    if client is None:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise RuntimeError("GEMINI_API_KEY is not configured")
        client = genai.Client(api_key=api_key)

    return client


def extract_claims(extracted_pages: list[dict]) -> list[dict]:
    claims = []

    for page in extracted_pages:
        prompt = f"""
You are a scientific evidence extraction agent.

Extract scientific claims and numerical results from the
following document page.

Document: {page['document']}
Page: {page['page']}

TEXT:
{page['text']}

Return ONLY a JSON array.

Each item must follow this format:
{{
  "claim": "Scientific claim",
  "value": "Numerical value or null",
  "metric": "Metric name or null",
  "evidence": "Exact supporting text"
}}

Rules:
- Do not invent scientific claims.
- Preserve numerical values exactly.
- Extract only claims present in the text.
- Return [] if no relevant claims are present.
"""

        response = get_client().models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config={
                "response_mime_type": "application/json"
            }
        )

        data = json.loads(response.text or "[]")

        if not isinstance(data, list):
            raise ValueError("Gemini returned an invalid claims format")

        for claim in data:
            claims.append({
                **claim,
                "document_id": page.get("document_id"),
                "document": page["document"],
                "page": page["page"]
            })

    return claims
