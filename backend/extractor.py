import pymupdf as fitz


def extract_pdf(filename: str, content: bytes):
    documents = []

    with fitz.open(stream=content, filetype="pdf") as pdf:
        for page_number, page in enumerate(pdf, start=1):
            documents.append({
                "document": filename,
                "page": page_number,
                "text": page.get_text()
            })

    return documents
