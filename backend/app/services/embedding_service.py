from typing import List

from openai import OpenAI

from app.config import settings


def get_embedding(text: str) -> List[float]:
    client = OpenAI(api_key=settings.openai_api_key)
    resp = client.embeddings.create(model="text-embedding-3-small", input=text)
    return resp.data[0].embedding


def summarize_conversation(conversation: str) -> str:
    client = OpenAI(api_key=settings.openai_api_key)
    prompt = f"""You are analyzing a dating app onboarding conversation to create a personality profile.

Conversation:
{conversation}

Write a rich 3-5 sentence personality summary that captures:
- Core personality traits and values
- Interests and hobbies
- What they're looking for in a relationship
- Communication style and emotional depth

Write in third person (e.g. "This person..."). Be specific and avoid generic phrases."""

    resp = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=300,
        temperature=0.5,
    )
    return resp.choices[0].message.content.strip()
