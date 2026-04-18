"""Data loading route — uploads stores + requests files, loads demographics."""
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from app.services import (
    load_demographics, parse_uploaded_df,
    get_key, set_key, session_exists,
)
from app.utils import get_logger

log = get_logger("routes.data")
router = APIRouter(tags=["Data"])


@router.post("/load_data")
async def load_data(
    session_id:     str        = Form(...),
    stores_file:    UploadFile = File(...),
    requests_file:  UploadFile = File(None),
):
    """
    Accepts:
      - stores_file   (required) — existing franchise stores
      - requests_file (optional) — franchise request locations
    Loads demographics for the country/state in the current session.
    Stores all DataFrames in session for downstream pipeline use.
    """
    if not session_exists(session_id):
        raise HTTPException(404, "Session not found.")

    country = get_key(session_id, "country")
    state   = get_key(session_id, "state")
    if not country or not state:
        raise HTTPException(400, "Country/state not selected. Call /select_country and /select_state first.")

    # Load demographics
    try:
        demog_df = load_demographics(country, state)
        set_key(session_id, "demographics_df", demog_df)
    except (FileNotFoundError, ValueError) as e:
        raise HTTPException(422, str(e))

    # Parse stores
    stores_bytes = await stores_file.read()
    try:
        stores_df = parse_uploaded_df(stores_bytes, stores_file.filename)
        set_key(session_id, "stores_df", stores_df)
    except ValueError as e:
        raise HTTPException(422, f"Stores file error: {e}")

    # Parse requests (optional)
    requests_df = None
    if requests_file and requests_file.filename:
        req_bytes = await requests_file.read()
        try:
            requests_df = parse_uploaded_df(req_bytes, requests_file.filename)
            set_key(session_id, "requests_df", requests_df)
        except ValueError as e:
            raise HTTPException(422, f"Requests file error: {e}")

    log.info(f"[Data] session={session_id} stores={len(stores_df)} requests={len(requests_df) if requests_df is not None else 0}")

    return {
        "success":         True,
        "n_stores":        len(stores_df),
        "n_requests":      len(requests_df) if requests_df is not None else 0,
        "n_demographics":  len(demog_df),
        "store_columns":   list(stores_df.columns),
    }
