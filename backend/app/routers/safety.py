from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from app.adapters.firestore_client import get_firestore_client
from app.deps import CurrentUser, get_current_user
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/profiles", tags=["safety"])


class ReportRequest(BaseModel):
    reason: Optional[str] = None


@router.post("/{uid}/report")
def report_user(
    uid: str,
    body: ReportRequest,
    current_user: CurrentUser = Depends(get_current_user),
):
    if uid == current_user.uid:
        raise HTTPException(status_code=400, detail="Cannot report yourself")

    db = get_firestore_client()

    if not db.collection("profiles").document(uid).get().exists:
        raise HTTPException(status_code=404, detail="User not found")

    db.collection("reports").add(
        {
            "from_uid": current_user.uid,
            "to_uid": uid,
            "reason": body.reason or "",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "status": "pending",
        }
    )
    return {"message": "Report submitted"}


@router.post("/{uid}/block")
def block_user(
    uid: str,
    current_user: CurrentUser = Depends(get_current_user),
):
    if uid == current_user.uid:
        raise HTTPException(status_code=400, detail="Cannot block yourself")

    db = get_firestore_client()

    if not db.collection("profiles").document(uid).get().exists:
        raise HTTPException(status_code=404, detail="User not found")

    # Check if already blocked
    existing = (
        db.collection("blocks")
        .where("from_uid", "==", current_user.uid)
        .where("to_uid", "==", uid)
        .limit(1)
        .get()
    )
    if list(existing):
        return {"message": "Already blocked"}

    db.collection("blocks").add(
        {
            "from_uid": current_user.uid,
            "to_uid": uid,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
    )
    return {"message": "User blocked"}


@router.delete("/{uid}/block")
def unblock_user(
    uid: str,
    current_user: CurrentUser = Depends(get_current_user),
):
    db = get_firestore_client()

    blocks = (
        db.collection("blocks")
        .where("from_uid", "==", current_user.uid)
        .where("to_uid", "==", uid)
        .get()
    )
    for doc in blocks:
        doc.reference.delete()

    return {"message": "User unblocked"}
