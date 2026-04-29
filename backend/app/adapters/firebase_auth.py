from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any, Dict

import firebase_admin
from firebase_admin import auth, credentials

from app.config import settings

_app_initialized = False


def _init_firebase_app() -> None:
    global _app_initialized
    if _app_initialized:
        return

    cred = None

    # Method 1: JSON string in env var
    if settings.firebase_credentials_json:
        cred = credentials.Certificate(json.loads(settings.firebase_credentials_json))

    # Method 2: File path
    else:
        cred_path = settings.firebase_credentials_path
        if cred_path:
            if not os.path.isabs(cred_path):
                # Resolve relative to backend/ root
                from app.config import ROOT_DIR
                abs_path = ROOT_DIR / cred_path
                if abs_path.exists():
                    cred_path = str(abs_path)
                else:
                    cwd_path = Path.cwd() / cred_path
                    if cwd_path.exists():
                        cred_path = str(cwd_path)
                    else:
                        raise RuntimeError(
                            f"Firebase credentials file not found at {abs_path} or {cwd_path}"
                        )
            cred = credentials.Certificate(cred_path)

    if cred is None:
        raise RuntimeError(
            "Firebase credentials not configured. Set FIREBASE_CREDENTIALS_PATH "
            "or FIREBASE_CREDENTIALS_JSON in your .env file."
        )

    firebase_admin.initialize_app(cred, {"projectId": settings.firebase_project_id})
    _app_initialized = True


def verify_id_token(id_token: str) -> Dict[str, Any]:
    _init_firebase_app()
    return auth.verify_id_token(id_token, clock_skew_seconds=60)


def create_user(email: str, password: str, display_name: str | None = None) -> auth.UserRecord:
    _init_firebase_app()
    return auth.create_user(
        email=email,
        password=password,
        display_name=display_name or email.split("@")[0],
        email_verified=False,
    )


def delete_user(uid: str) -> None:
    _init_firebase_app()
    auth.delete_user(uid)


def generate_email_verification_link(email: str) -> str:
    _init_firebase_app()
    return auth.generate_email_verification_link(email)
