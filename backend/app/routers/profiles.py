from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.adapters.firestore_client import get_firestore_client
from app.deps import CurrentUser, get_current_user

router = APIRouter(prefix="/profiles", tags=["profiles"])


class LocationModel(BaseModel):
    lat: Optional[float] = None
    lon: Optional[float] = None


class PrefsModel(BaseModel):
    age_min: Optional[int] = None
    age_max: Optional[int] = None
    seek_gender: Optional[List[str]] = None
    max_distance_km: Optional[float] = None


class ProfileUpsert(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    orientation: Optional[str] = None
    pronouns: Optional[str] = None
    bio: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    job_title: Optional[str] = None
    school: Optional[str] = None
    height_cm: Optional[int] = None
    looking_for: Optional[str] = None
    interests: Optional[List[str]] = None
    photos: Optional[List[str]] = None
    location: Optional[LocationModel] = None
    prefs: Optional[PrefsModel] = None


@router.post("/me")
def upsert_profile(
    body: ProfileUpsert,
    current_user: CurrentUser = Depends(get_current_user),
):
    db = get_firestore_client()
    ref = db.collection("profiles").document(current_user.uid)

    update_data: Dict[str, Any] = {}
    for field, value in body.model_dump(exclude_unset=True).items():
        if field == "location" and value is not None:
            update_data["location"] = value
        elif field == "prefs" and value is not None:
            update_data["prefs"] = value
        else:
            update_data[field] = value

    if update_data:
        ref.set(update_data, merge=True)

    doc = ref.get()
    return doc.to_dict() if doc.exists else update_data


@router.get("/me")
def get_my_profile(current_user: CurrentUser = Depends(get_current_user)):
    db = get_firestore_client()
    doc = db.collection("profiles").document(current_user.uid).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Profile not found")
    return doc.to_dict()


@router.get("/{uid}")
def get_profile(uid: str, current_user: CurrentUser = Depends(get_current_user)):
    db = get_firestore_client()

    # Check if blocked
    block_query = (
        db.collection("blocks")
        .where("from_uid", "==", uid)
        .where("to_uid", "==", current_user.uid)
        .limit(1)
        .get()
    )
    if list(block_query):
        raise HTTPException(status_code=403, detail="You cannot view this profile")

    doc = db.collection("profiles").document(uid).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Profile not found")

    profile = doc.to_dict()
    # Return public-safe subset
    return {
        "uid": profile.get("uid"),
        "first_name": profile.get("first_name"),
        "last_name": profile.get("last_name"),
        "age": profile.get("age"),
        "gender": profile.get("gender"),
        "bio": profile.get("bio"),
        "city": profile.get("city"),
        "state": profile.get("state"),
        "job_title": profile.get("job_title"),
        "school": profile.get("school"),
        "interests": profile.get("interests", []),
        "photos": profile.get("photos", []),
        "looking_for": profile.get("looking_for"),
        "pronouns": profile.get("pronouns"),
    }
