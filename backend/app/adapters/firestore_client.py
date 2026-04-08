import os
from pathlib import Path

from google.cloud import firestore

from app.config import settings

_db: firestore.Client | None = None


def get_firestore_client() -> firestore.Client:
    global _db
    if _db is not None:
        return _db

    cred_path = settings.firebase_credentials_path
    if cred_path:
        if not os.path.isabs(cred_path):
            from app.config import ROOT_DIR
            abs_path = ROOT_DIR / cred_path
            if abs_path.exists():
                cred_path = str(abs_path)
            else:
                cwd_path = Path.cwd() / cred_path
                if cwd_path.exists():
                    cred_path = str(cwd_path)
        if cred_path and os.path.exists(cred_path):
            os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = cred_path

    _db = firestore.Client(project=settings.firebase_project_id)
    return _db
