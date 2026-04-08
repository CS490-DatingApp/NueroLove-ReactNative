from datetime import datetime, timezone
from typing import Optional

import requests as http_requests
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr

from app.adapters import firebase_auth
from app.adapters.firestore_client import get_firestore_client
from app.adapters.qdrant_adapter import COLLECTION_NAME, uid_to_qdrant_id
from app.config import settings
from app.deps import CurrentUser, get_current_user, get_qdrant

router = APIRouter(prefix="/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    display_name: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


@router.post("/register", status_code=201)
def register(req: RegisterRequest):
    try:
        user = firebase_auth.create_user(
            email=req.email,
            password=req.password,
            display_name=req.display_name,
        )

        db = get_firestore_client()
        profile_data = {
            "uid": user.uid,
            "email": req.email,
            "display_name": user.display_name,
            "onboarding_completed": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "last_login": None,
            "email_verified": False,
        }
        db.collection("profiles").document(user.uid).set(profile_data)

        # Sign in to get an ID token for the client
        url = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={settings.firebase_web_api_key}"
        sign_in_resp = http_requests.post(
            url,
            json={
                "email": req.email,
                "password": req.password,
                "returnSecureToken": True,
            },
        )
        sign_in_data = sign_in_resp.json()
        token = sign_in_data.get("idToken", "")

        return {
            "token": token,
            "refresh_token": sign_in_data.get("refreshToken", ""),
            "user": {
                "uid": user.uid,
                "email": req.email,
                "onboarding_completed": False,
                "display_name": user.display_name,
            },
        }

    except Exception as e:
        detail = str(e)
        if "EMAIL_EXISTS" in detail or "already exists" in detail.lower():
            raise HTTPException(status_code=400, detail="Email already exists")
        raise HTTPException(status_code=400, detail=f"Registration failed: {detail}")


@router.post("/login")
def login(req: LoginRequest):
    try:
        url = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={settings.firebase_web_api_key}"
        resp = http_requests.post(
            url,
            json={
                "email": req.email,
                "password": req.password,
                "returnSecureToken": True,
            },
        )
        data = resp.json()

        if "error" in data:
            raise HTTPException(status_code=401, detail=data["error"]["message"])

        uid = data["localId"]

        # Fetch profile from Firestore
        db = get_firestore_client()
        doc = db.collection("profiles").document(uid).get()
        profile = doc.to_dict() if doc.exists else {}

        # Update last_login
        db.collection("profiles").document(uid).update(
            {"last_login": datetime.now(timezone.utc).isoformat()}
        )

        return {
            "token": data["idToken"],
            "refresh_token": data.get("refreshToken", ""),
            "user": {
                "uid": uid,
                "email": data["email"],
                "onboarding_completed": profile.get("onboarding_completed", False),
                "display_name": profile.get("display_name"),
                "first_name": profile.get("first_name"),
                "last_name": profile.get("last_name"),
                "bio": profile.get("bio"),
                "city": profile.get("city"),
                "state": profile.get("state"),
                "job_title": profile.get("job_title"),
                "school": profile.get("school"),
                "height_cm": profile.get("height_cm"),
                "pronouns": profile.get("pronouns"),
                "looking_for": profile.get("looking_for"),
                "interests": profile.get("interests", []),
                "photos": profile.get("photos", []),
            },
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Login error: {e}")


@router.get("/me")
def get_me(current_user: CurrentUser = Depends(get_current_user)):
    db = get_firestore_client()
    doc = db.collection("profiles").document(current_user.uid).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Profile not found")
    profile = doc.to_dict()
    return {
        "uid": current_user.uid,
        "email": current_user.email,
        "onboarding_completed": profile.get("onboarding_completed", False),
        "display_name": profile.get("display_name"),
        "first_name": profile.get("first_name"),
        "last_name": profile.get("last_name"),
        "bio": profile.get("bio"),
        "city": profile.get("city"),
        "state": profile.get("state"),
        "job_title": profile.get("job_title"),
        "school": profile.get("school"),
        "height_cm": profile.get("height_cm"),
        "pronouns": profile.get("pronouns"),
        "looking_for": profile.get("looking_for"),
        "interests": profile.get("interests", []),
        "photos": profile.get("photos", []),
    }


@router.delete("/delete-account")
def delete_account(current_user: CurrentUser = Depends(get_current_user)):
    uid = current_user.uid
    try:
        db = get_firestore_client()
        db.collection("profiles").document(uid).delete()

        qdrant = get_qdrant()
        if qdrant:
            try:
                qdrant.delete(COLLECTION_NAME, [uid_to_qdrant_id(uid)])
            except Exception:
                pass

        firebase_auth.delete_user(uid)
        return {"message": "Account deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error deleting account: {e}")
