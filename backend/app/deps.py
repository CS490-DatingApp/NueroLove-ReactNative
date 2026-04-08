from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.adapters import firebase_auth
from app.adapters.firestore_client import get_firestore_client
from app.adapters.qdrant_adapter import QdrantAdapter
from app.config import settings

security = HTTPBearer()

_qdrant: QdrantAdapter | None = None


@dataclass
class CurrentUser:
    uid: str
    email: str
    claims: Dict[str, Any]


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> CurrentUser:
    try:
        decoded = firebase_auth.verify_id_token(credentials.credentials)
        return CurrentUser(
            uid=decoded["uid"],
            email=decoded.get("email", ""),
            claims=decoded,
        )
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid credentials: {e}")


def get_db():
    return get_firestore_client()


def get_qdrant() -> QdrantAdapter | None:
    global _qdrant
    if _qdrant is not None:
        return _qdrant
    if not settings.qdrant_url or not settings.qdrant_api_key:
        return None
    url = settings.qdrant_url
    if not url.startswith(("http://", "https://")):
        url = f"https://{url}"
    _qdrant = QdrantAdapter(url=url, api_key=settings.qdrant_api_key)
    _qdrant.ensure_collection()
    return _qdrant
