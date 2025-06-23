import os
import openai
import fitz  # PyMuPDF
import json
import csv
import uuid
import time

openai.api_key = os.getenv("OPENAI_API_KEY")
OUTPUT_DIR = "uploads"

def call_gpt_with_retries(prompt, retries=2, delay=3):
    for attempt in range(retries + 1):
        try:
            response = openai.chat.completions.create(
                model="gpt-4o",
                messages=[{"role": "user", "content": prompt}]
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            print(f"Retry {attempt+1} failed: {e}")
            time.sleep(delay * (attempt + 1))
    raise RuntimeError("GPT failed after retries.")

def extract_text_with_pymupdf(pdf_path: str) -> list[str]:
    doc = fitz.open(pdf_path)
    pages = []
    for page in doc:
        blocks = page.get_text("blocks")
        blocks.sort(key=lambda b: (b[1], b[0]))  # sort by y, then x
        text = "\n".join(b[4] for b in blocks if b[4].strip())
        pages.append(text)
    return pages

def merge_gpt_page_jsons_to_csv() -> str:
    all_data = []
    fieldnames = ["date", "payee", "amount", "reference_no", "description"]
    output_path = os.path.join(OUTPUT_DIR, "merged_gpt_output.csv")

    for filename in sorted(os.listdir(OUTPUT_DIR)):
        if filename.startswith("gpt_page_") and filename.endswith(".json"):
            filepath = os.path.join(OUTPUT_DIR, filename)
            try:
                with open(filepath, "r", encoding="utf-8") as f:
                    content = f.read()
                    if content.startswith("```"):
                        content = content.strip("`").replace("json", "").strip()
                    data = json.loads(content)
                    if isinstance(data, list):
                        for row in data:
                            row.setdefault("reference_no", "")
                            all_data.append(row)
            except Exception as e:
                print(f"⚠️ Failed to load {filename}: {e}")

    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(all_data)

    print("✅ Merged CSV written to:", output_path)
    return output_path


def clean_page_text(text: str) -> str:
    """Merge split lines in bank statements to improve GPT parsing."""
    lines = text.splitlines()
    cleaned_lines = []
    temp_line = ""

    for line in lines:
        if line.strip() == "":
            continue
        if line.strip().startswith(("Nov", "Oct", "Sep", "Aug", "Jul", "Jun", "May", "Apr", "Mar", "Feb", "Jan", "Dec")):
            if temp_line:
                cleaned_lines.append(temp_line.strip())
            temp_line = line
        else:
            temp_line += " " + line
    if temp_line:
        cleaned_lines.append(temp_line.strip())

    return "\n".join(cleaned_lines)

def send_pdf_to_openai(pdf_path: str, uuid_dir: str) -> str:
    os.makedirs(uuid_dir, exist_ok=True)

    # Clean old JSONs in this folder if any
    for f in os.listdir(uuid_dir):
        if f.startswith("gpt_page_") and f.endswith(".json"):
            os.remove(os.path.join(uuid_dir, f))

    all_transactions = []
    pages = extract_text_with_pymupdf(pdf_path)

    for i, raw_text in enumerate(pages):
        print(f"Processing page {i+1}/{len(pages)}...")
        cleaned_text = clean_page_text(raw_text)

        if not cleaned_text.strip():
            print(f"[Page {i+1}] No text extracted.")
            continue

        prompt = (
            "You are a JSON-only API. Given a raw bank statement, extract each transaction into JSON with the following fields:\n\n"
            "date, payee, amount (positive=deposit, negative=withdrawal), reference_no (if available), description.\n\n"
            "Format:\n[{\"date\": \"YYYY-MM-DD\", \"payee\": \"Starbucks\", \"amount\": -5.99, \"reference_no\": \"\", \"description\": \"POS Purchase Starbucks Toronto\"}]\n\n"
            "Only return valid JSON. No markdown, no explanation. Input:\n\n"
            f"{cleaned_text}"
        )

        try:
            response = call_gpt_with_retries(prompt)
            content = response

            if content.startswith("```"):
                content = content.split("```")[1].replace("json", "", 1).strip()

            with open(f"{uuid_dir}/gpt_page_{i+1}.json", "w", encoding="utf-8") as f:
                f.write(content)

            transactions = json.loads(content)
            if isinstance(transactions, list):
                for row in transactions:
                    row.setdefault("reference_no", "")
                    all_transactions.append(row)
        except Exception as e:
            print(f"[Page {i+1}] GPT error:", e)

    if not all_transactions:
        raise ValueError("No transactions found.")

    csv_path = os.path.join(uuid_dir, "converted.csv")
    with open(csv_path, "w", newline="", encoding="utf-8") as csv_file:
        writer = csv.DictWriter(csv_file, fieldnames=["date", "payee", "amount", "reference_no", "description"])
        writer.writeheader()
        for row in all_transactions:
            writer.writerow(row)

    return csv_path
