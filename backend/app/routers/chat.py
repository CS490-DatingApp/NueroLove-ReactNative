import uuid
from typing import List, Literal

from fastapi import APIRouter, Depends, HTTPException
from openai import AsyncOpenAI
from pydantic import BaseModel

from app.adapters.firestore_client import get_firestore_client
from app.config import settings
from app.deps import CurrentUser, get_current_user

router = APIRouter(prefix="/chat", tags=["chat"])

SYSTEM_PROMPTS = {
    "onboarding": (
        "You are Neuro, a warm and curious AI companion helping someone set up their dating profile. "
        "Ask friendly questions to learn about them and help craft an authentic, engaging profile. "
        "Keep responses concise and conversational."
    ),
    "coaching": (
        "You are Neuro, an expert dating coach. Help the user with dating advice, profile tips, "
        "conversation starters, and relationship guidance. Be supportive, practical, and direct. "
        "Keep responses concise."
    ),
}

PARAMS = {
    "onboarding": {"max_tokens": 150, "temperature": 0.85},
    "coaching": {"max_tokens": 200, "temperature": 0.8},
}


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    text: str


class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    context: Literal["onboarding", "coaching"] = "coaching"
    interests: List[str] = []


class ChatResponse(BaseModel):
    text: str
    id: str


class SaveOnboardingRequest(BaseModel):
    messages: List[ChatMessage]


@router.post("", response_model=ChatResponse)
async def chat(
    body: ChatRequest,
    current_user: CurrentUser = Depends(get_current_user),
):
    if not settings.openai_api_key:
        raise HTTPException(status_code=503, detail="OpenAI API key not configured")

    client = AsyncOpenAI(api_key=settings.openai_api_key)

    system = SYSTEM_PROMPTS[body.context]
    if body.interests:
        system += (
            f"\n\nThis user's interests include: {', '.join(body.interests)}. "
            "Weave these naturally into your questions and responses to make the conversation feel personal."
        )

    messages = [{"role": "system", "content": system}]
    for msg in body.messages:
        messages.append({"role": msg.role, "content": msg.text})

    params = PARAMS[body.context]
    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            max_tokens=params["max_tokens"],
            temperature=params["temperature"],
        )
    except Exception as e:
        err = str(e)
        if "insufficient_quota" in err or "429" in err:
            raise HTTPException(
                status_code=402,
                detail="OpenAI quota exceeded. Add billing at platform.openai.com/account/billing.",
            )
        raise HTTPException(status_code=503, detail=f"OpenAI error: {err}")

    text = response.choices[0].message.content or ""
    return ChatResponse(text=text, id=str(uuid.uuid4()))


@router.post("/onboarding/save")
def save_onboarding(
    body: SaveOnboardingRequest,
    current_user: CurrentUser = Depends(get_current_user),
):
    db = get_firestore_client()
    chat_data = [{"role": m.role, "text": m.text} for m in body.messages]
    db.collection("profiles").document(current_user.uid).update(
        {
            "onboarding_chat": chat_data,
            "onboarding_completed": True,
        }
    )
    return {"ok": True}
