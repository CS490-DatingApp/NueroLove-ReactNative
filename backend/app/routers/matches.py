import random

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.dependencies import get_current_user, get_db
from app.models.like import Like
from app.models.user import Profile, User
from app.schemas.profile import DiscoverProfile

router = APIRouter()


@router.get("/discover", response_model=list[DiscoverProfile])
async def discover(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # IDs already liked by current user
    liked_result = await db.execute(
        select(Like.liked_id).where(Like.liker_id == current_user.id)
    )
    liked_ids = {row[0] for row in liked_result.all()}
    liked_ids.add(current_user.id)  # exclude self

    result = await db.execute(select(Profile))
    profiles = [p for p in result.scalars().all() if p.user_id not in liked_ids]
    random.shuffle(profiles)
    return profiles


@router.post("/{user_id}/like")
async def like_user(
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot like yourself")

    # Check target user exists
    target = await db.get(User, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    # Upsert like
    existing = await db.execute(
        select(Like).where(Like.liker_id == current_user.id, Like.liked_id == user_id)
    )
    if existing.scalar_one_or_none() is None:
        db.add(Like(liker_id=current_user.id, liked_id=user_id))
        await db.commit()

    # Check mutual like (match)
    mutual = await db.execute(
        select(Like).where(Like.liker_id == user_id, Like.liked_id == current_user.id)
    )
    is_match = mutual.scalar_one_or_none() is not None

    return {"match": is_match}
