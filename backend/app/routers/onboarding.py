from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.adapters.firestore_client import get_firestore_client
from app.adapters.qdrant_adapter import COLLECTION_NAME, uid_to_qdrant_id
from app.config import settings
from app.deps import CurrentUser, get_current_user, get_qdrant
from app.services.embedding_service import get_embedding, summarize_conversation

router = APIRouter(prefix="/onboarding", tags=["onboarding"])


class SummarizeRequest(BaseModel):
    conversation: str


@router.post("/summarize")
def summarize_and_embed(
    req: SummarizeRequest,
    current_user: CurrentUser = Depends(get_current_user),
):
    uid = current_user.uid

    if not settings.openai_api_key:
        raise HTTPException(status_code=503, detail="OpenAI API key not configured")

    try:
        # Step 1: Summarize conversation into personality profile
        personality_summary = summarize_conversation(req.conversation)

        # Step 2: Embed the summary
        embedding = get_embedding(personality_summary)

        # Step 3: Pull profile metadata from Firestore
        db = get_firestore_client()
        doc = db.collection("profiles").document(uid).get()
        profile = doc.to_dict() if doc.exists else {}

        # Step 4: Upsert into Qdrant (if configured)
        qdrant = get_qdrant()
        if qdrant:
            payload = {
                "uid": uid,
                "email": current_user.email,
                "personality_summary": personality_summary,
                "age": profile.get("age"),
                "gender": profile.get("gender"),
                "display_name": profile.get("display_name"),
                "interests": profile.get("interests", []),
                "lat": (profile.get("location") or {}).get("lat"),
                "lon": (profile.get("location") or {}).get("lon"),
                "prefs": profile.get("prefs", {}),
            }
            qdrant.upsert(
                collection=COLLECTION_NAME,
                points=[(uid_to_qdrant_id(uid), embedding, payload)],
            )

        # Step 5: Update Firestore with summary
        db.collection("profiles").document(uid).update(
            {
                "personality_summary": personality_summary,
                "onboarding_completed": True,
            }
        )

        return {
            "success": True,
            "user_id": uid,
            "personality_summary": personality_summary,
            "vector_stored": qdrant is not None,
            "onboarding_completed": True,
        }

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Onboarding summarization error: {e}"
        )


@router.put("/complete")
def mark_onboarding_complete(
    current_user: CurrentUser = Depends(get_current_user),
):
    uid = current_user.uid
    db = get_firestore_client()
    ref = db.collection("profiles").document(uid)

    if not ref.get().exists:
        raise HTTPException(status_code=404, detail="Profile not found")

    ref.update({"onboarding_completed": True})
    return {"success": True, "user_id": uid, "onboarding_completed": True}
