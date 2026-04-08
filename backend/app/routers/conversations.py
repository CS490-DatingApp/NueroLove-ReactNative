import threading
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from openai import OpenAI
from pydantic import BaseModel

from app.adapters.firestore_client import get_firestore_client
from app.config import settings
from app.deps import CurrentUser, get_current_user

router = APIRouter(prefix="/conversations", tags=["conversations"])


def conv_id(uid_a: str, uid_b: str) -> str:
    """Deterministic conversation ID — smaller UID first."""
    return f"{min(uid_a, uid_b)}_{max(uid_a, uid_b)}"


class SendMessageRequest(BaseModel):
    text: str


@router.get("/{partner_uid}")
def get_messages(
    partner_uid: str,
    limit: int = 50,
    current_user: CurrentUser = Depends(get_current_user),
):
    uid = current_user.uid
    db = get_firestore_client()
    cid = conv_id(uid, partner_uid)

    msgs = (
        db.collection("conversations")
        .document(cid)
        .collection("messages")
        .order_by("created_at")
        .limit_to_last(limit)
        .get()
    )

    return [
        {
            "id": m.id,
            "sender_uid": m.to_dict()["sender_uid"],
            "text": m.to_dict()["text"],
            "created_at": m.to_dict()["created_at"],
            "is_mine": m.to_dict()["sender_uid"] == uid,
        }
        for m in msgs
    ]


def _bot_reply(cid: str, bot_uid: str, bot_profile: dict, user_message: str) -> None:
    """Generate and store an AI reply from the bot. Runs in a background thread."""
    import time
    time.sleep(1.5)  # simulate typing delay

    db = get_firestore_client()
    now = datetime.now(timezone.utc).isoformat()

    name = bot_profile.get("first_name", "them")
    bio = bot_profile.get("bio", "")
    interests = ", ".join(bot_profile.get("interests", []))
    summary = bot_profile.get("personality_summary", "")
    looking_for = bot_profile.get("looking_for", "")

    system_prompt = (
        f"You are {name}, a real person on a dating app. Stay completely in character. "
        f"Bio: {bio}. Interests: {interests}. Looking for: {looking_for}. "
        f"Personality: {summary}. "
        f"Respond naturally like you're texting — casual, warm, and genuine. "
        f"Keep replies short (1-3 sentences). Do NOT mention you are an AI. "
        f"Ask a follow-up question occasionally to keep the conversation going."
    )

    reply_text = None
    if settings.openai_api_key:
        try:
            client = OpenAI(api_key=settings.openai_api_key)
            resp = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message},
                ],
                max_tokens=120,
                temperature=0.85,
            )
            reply_text = resp.choices[0].message.content.strip()
        except Exception:
            pass

    if not reply_text:
        # Fallback replies if OpenAI fails
        import random
        fallbacks = [
            "Haha that's so true! What do you like to do on weekends?",
            "Oh interesting! Tell me more 😊",
            "I feel the same way! We should definitely hang out sometime.",
            "That's really cool. What else are you into?",
        ]
        reply_text = random.choice(fallbacks)

    conv_ref = db.collection("conversations").document(cid)
    conv_ref.collection("messages").add({
        "sender_uid": bot_uid,
        "text": reply_text,
        "created_at": now,
    })
    conv_ref.update({"last_message": reply_text, "last_message_at": now})


@router.post("/{partner_uid}")
def send_message(
    partner_uid: str,
    body: SendMessageRequest,
    current_user: CurrentUser = Depends(get_current_user),
):
    if not body.text.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    uid = current_user.uid
    db = get_firestore_client()
    cid = conv_id(uid, partner_uid)
    now = datetime.now(timezone.utc).isoformat()

    # Ensure conversation doc exists
    conv_ref = db.collection("conversations").document(cid)
    if not conv_ref.get().exists:
        conv_ref.set({"participants": [uid, partner_uid], "created_at": now})

    # Add user's message
    msg_ref = conv_ref.collection("messages").add({
        "sender_uid": uid,
        "text": body.text.strip(),
        "created_at": now,
    })

    # Update last message on conversation doc
    conv_ref.update({"last_message": body.text.strip(), "last_message_at": now})

    # Check if partner is a bot — if so, trigger auto-reply in background
    partner_doc = db.collection("profiles").document(partner_uid).get()
    if partner_doc.exists:
        partner_data = partner_doc.to_dict()
        if partner_data.get("is_bot"):
            thread = threading.Thread(
                target=_bot_reply,
                args=(cid, partner_uid, partner_data, body.text.strip()),
                daemon=True,
            )
            thread.start()

    return {"id": msg_ref[1].id, "created_at": now}
