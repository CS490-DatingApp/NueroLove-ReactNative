from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from openai import OpenAI

from app.adapters.firestore_client import get_firestore_client
from app.adapters.qdrant_adapter import COLLECTION_NAME
from app.config import settings
from app.deps import CurrentUser, get_current_user, get_qdrant
from app.services.embedding_service import get_embedding
from app.services.match_service import discover_matches, generate_explanation

router = APIRouter(prefix="/matches", tags=["matches"])


def _get_blocked_uids(db, uid: str) -> set:
    blocked_by_me = db.collection("blocks").where("from_uid", "==", uid).get()
    blocked_me = db.collection("blocks").where("to_uid", "==", uid).get()
    uids = set()
    for doc in blocked_by_me:
        uids.add(doc.to_dict().get("to_uid"))
    for doc in blocked_me:
        uids.add(doc.to_dict().get("from_uid"))
    return uids


def _get_liked_uids(db, uid: str) -> set:
    liked = db.collection("feedback").where("from_uid", "==", uid).get()
    return {doc.to_dict().get("to_uid") for doc in liked}


@router.get("/discover")
def discover(
    limit: int = 20,
    current_user: CurrentUser = Depends(get_current_user),
):
    uid = current_user.uid
    db = get_firestore_client()
    qdrant = get_qdrant()

    # Get user's profile
    doc = db.collection("profiles").document(uid).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Profile not found. Create one first.")
    profile = doc.to_dict()

    blocked_uids = _get_blocked_uids(db, uid)
    liked_uids = _get_liked_uids(db, uid)

    # Vector-based discovery if Qdrant is configured and user has a summary
    if qdrant and profile.get("personality_summary"):
        try:
            seeker_vector = get_embedding(profile["personality_summary"])
            matches = discover_matches(
                qdrant=qdrant,
                seeker_uid=uid,
                seeker_vector=seeker_vector,
                seeker_profile=profile,
                blocked_uids=blocked_uids,
                already_liked_uids=liked_uids,
                limit=limit,
            )

            # Enrich with Firestore profile data
            enriched = []
            for m in matches:
                cand_doc = db.collection("profiles").document(m["user_id"]).get()
                if not cand_doc.exists:
                    continue
                cand = cand_doc.to_dict()
                enriched.append(
                    {
                        "id": m["user_id"],
                        "user_id": m["user_id"],
                        "first_name": cand.get("first_name"),
                        "name": cand.get("first_name") or cand.get("display_name"),
                        "age": cand.get("age"),
                        "city": cand.get("city"),
                        "state": cand.get("state"),
                        "bio": cand.get("bio"),
                        "interests": cand.get("interests", []),
                        "photos": cand.get("photos", []),
                        "job_title": cand.get("job_title"),
                        "compatibility": round(m["score"] * 100),
                        "reasons": m.get("reasons", []),
                    }
                )
            return enriched

        except Exception:
            pass  # Fall through to Firestore-based discovery

    # Fallback: Firestore-based discovery (no vectors)
    exclude = blocked_uids | liked_uids | {uid}
    all_profiles = db.collection("profiles").where("onboarding_completed", "==", True).limit(100).get()

    results = []
    for pdoc in all_profiles:
        p = pdoc.to_dict()
        p_uid = p.get("uid", pdoc.id)
        if p_uid in exclude:
            continue
        results.append(
            {
                "id": p_uid,
                "user_id": p_uid,
                "first_name": p.get("first_name"),
                "name": p.get("first_name") or p.get("display_name"),
                "age": p.get("age"),
                "city": p.get("city"),
                "state": p.get("state"),
                "bio": p.get("bio"),
                "interests": p.get("interests", []),
                "photos": p.get("photos", []),
                "job_title": p.get("job_title"),
            }
        )
        if len(results) >= limit:
            break

    return results


@router.post("/{target_uid}/like")
def like_user(
    target_uid: str,
    current_user: CurrentUser = Depends(get_current_user),
):
    uid = current_user.uid
    if target_uid == uid:
        raise HTTPException(status_code=400, detail="Cannot like yourself")

    db = get_firestore_client()

    # Check target exists
    if not db.collection("profiles").document(target_uid).get().exists:
        raise HTTPException(status_code=404, detail="User not found")

    # Store feedback
    db.collection("feedback").add(
        {
            "from_uid": uid,
            "to_uid": target_uid,
            "action": "like",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
    )

    # If target is a bot, they auto-like back immediately
    target_doc = db.collection("profiles").document(target_uid).get()
    target_data = target_doc.to_dict() if target_doc.exists else {}
    if target_data.get("is_bot"):
        already_liked = (
            db.collection("feedback")
            .where("from_uid", "==", target_uid)
            .where("to_uid", "==", uid)
            .limit(1)
            .get()
        )
        if not list(already_liked):
            db.collection("feedback").add(
                {
                    "from_uid": target_uid,
                    "to_uid": uid,
                    "action": "like",
                    "created_at": datetime.now(timezone.utc).isoformat(),
                }
            )

    # Check for mutual match
    mutual_query = (
        db.collection("feedback")
        .where("from_uid", "==", target_uid)
        .where("to_uid", "==", uid)
        .where("action", "==", "like")
        .limit(1)
        .get()
    )
    is_match = bool(list(mutual_query))

    if is_match:
        # Create match document (avoid duplicates by checking first)
        existing = (
            db.collection("matches")
            .where("user_a", "==", min(uid, target_uid))
            .where("user_b", "==", max(uid, target_uid))
            .limit(1)
            .get()
        )
        if not list(existing):
            db.collection("matches").add(
                {
                    "user_a": min(uid, target_uid),
                    "user_b": max(uid, target_uid),
                    "created_at": datetime.now(timezone.utc).isoformat(),
                }
            )

    return {"match": is_match}


@router.get("/mine")
def get_my_matches(current_user: CurrentUser = Depends(get_current_user)):
    uid = current_user.uid
    db = get_firestore_client()

    # Query matches where user is user_a or user_b
    matches_a = db.collection("matches").where("user_a", "==", uid).get()
    matches_b = db.collection("matches").where("user_b", "==", uid).get()

    partner_uids = set()
    for doc in matches_a:
        partner_uids.add(doc.to_dict()["user_b"])
    for doc in matches_b:
        partner_uids.add(doc.to_dict()["user_a"])

    # Enrich with profile data
    results = []
    for partner_uid in partner_uids:
        pdoc = db.collection("profiles").document(partner_uid).get()
        if not pdoc.exists:
            continue
        p = pdoc.to_dict()
        results.append(
            {
                "uid": partner_uid,
                "first_name": p.get("first_name"),
                "display_name": p.get("display_name"),
                "photos": p.get("photos", []),
                "bio": p.get("bio"),
            }
        )

    return results


@router.get("/{target_uid}/explain")
def explain_match(
    target_uid: str,
    current_user: CurrentUser = Depends(get_current_user),
):
    uid = current_user.uid
    db = get_firestore_client()
    qdrant = get_qdrant()

    seeker_doc = db.collection("profiles").document(uid).get()
    cand_doc = db.collection("profiles").document(target_uid).get()

    if not seeker_doc.exists or not cand_doc.exists:
        raise HTTPException(status_code=404, detail="Profile not found")

    seeker = seeker_doc.to_dict()
    candidate = cand_doc.to_dict()

    # Try to get vector similarity from Qdrant
    similarity = 0.5  # default
    if qdrant and seeker.get("personality_summary"):
        try:
            vec = get_embedding(seeker["personality_summary"])
            results = qdrant.query(COLLECTION_NAME, vec, limit=50, with_payload=True)
            for r in results:
                if r["payload"].get("uid") == target_uid:
                    similarity = r["score"]
                    break
        except Exception:
            pass

    explanation = generate_explanation(seeker, candidate, similarity)

    # Generate AI explanation text
    ai_text = None
    if settings.openai_api_key:
        try:
            client = OpenAI(api_key=settings.openai_api_key)
            prompt = (
                f"Write a brief 2-sentence explanation of why these two people might be a good match. "
                f"Person A interests: {seeker.get('interests', [])}. Bio: {seeker.get('bio', 'N/A')}. "
                f"Person B interests: {candidate.get('interests', [])}. Bio: {candidate.get('bio', 'N/A')}. "
                f"Shared interests: {explanation.get('reasons', [])}."
            )
            resp = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=100,
                temperature=0.7,
            )
            ai_text = resp.choices[0].message.content.strip()
        except Exception:
            pass

    return {
        **explanation,
        "ai_explanation": ai_text,
    }
