import uuid

from fastapi import APIRouter, Depends, HTTPException
from openai import AsyncOpenAI
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.dependencies import get_current_user, get_db
from app.models.user import User
from app.schemas.chat import ChatRequest, ChatResponse, SaveOnboardingRequest

router = APIRouter()

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


@router.post("", response_model=ChatResponse)
async def chat(
    body: ChatRequest,
    current_user: User = Depends(get_current_user),
):
    if not settings.openai_api_key or settings.openai_api_key == "your-openai-api-key-here":
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
    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
        max_tokens=params["max_tokens"],
        temperature=params["temperature"],
    )

    text = response.choices[0].message.content or ""
    return ChatResponse(text=text, id=str(uuid.uuid4()))


@router.post("/onboarding/save")
async def save_onboarding(
    body: SaveOnboardingRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    current_user.onboarding_chat = [{"role": m.role, "text": m.text} for m in body.messages]
    current_user.onboarding_completed = True
    await db.commit()
    return {"ok": True}
