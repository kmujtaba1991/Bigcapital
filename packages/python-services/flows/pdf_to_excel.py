from prefect import flow
from utils.openai_utils import send_pdf_to_openai
from utils.openai_utils import merge_gpt_page_jsons_to_csv


@flow
def pdf_to_excel_flow(pdf_path: str, uuid_dir: str) -> str:
    return send_pdf_to_openai(pdf_path, uuid_dir)
