from fastapi import FastAPI, File, UploadFile
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import os, uuid
from pathlib import Path
from flows.pdf_to_excel import pdf_to_excel_flow
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_BASE = Path("uploads")
UPLOAD_BASE.mkdir(exist_ok=True)

@app.get("/")
def read_root():
    return {"message": "Server is running!"}

@app.post("/api/upload-pdf")
async def upload_pdf(file: UploadFile = File(...)):
    try:
        unique_id = str(uuid.uuid4())
        upload_dir = UPLOAD_BASE / unique_id
        upload_dir.mkdir(parents=True, exist_ok=True)

        input_pdf_path = upload_dir / "original.pdf"
        with open(input_pdf_path, "wb") as f:
            f.write(await file.read())

        print(f"📄 Saved PDF to {input_pdf_path}")

        converted_csv = pdf_to_excel_flow(str(input_pdf_path), str(upload_dir))

        if not Path(converted_csv).exists():
            raise FileNotFoundError("CSV output missing.")

        return FileResponse(
            converted_csv,
            filename="converted.csv",
            media_type="text/csv"
        )

    except Exception as e:
        print("❌ Failed:", str(e))
        return JSONResponse(status_code=500, content={"error": str(e)})
