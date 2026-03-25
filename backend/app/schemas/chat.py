from typing import List, Literal

from pydantic import BaseModel


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    text: str


class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    context: Literal["onboarding", "coaching"] = "coaching"
    interests: List[str] = []  # User's selected interests — injected into system prompt


class ChatResponse(BaseModel):
    text: str
    id: str


class SaveOnboardingRequest(BaseModel):
    messages: List[ChatMessage]
