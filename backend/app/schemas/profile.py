from typing import List, Optional

from pydantic import BaseModel, Field


class ProfileCreate(BaseModel):
    first_name: str
    last_name: Optional[str] = None
    age: int = Field(..., ge=18, le=99)
    gender: str
    orientation: str
    pronouns: Optional[str] = None
    bio: Optional[str] = Field(None, max_length=300)
    city: Optional[str] = None
    state: Optional[str] = None
    job_title: Optional[str] = None
    school: Optional[str] = None
    height_cm: Optional[int] = None
    looking_for: Optional[str] = None
    interests: List[str] = []
    photos: List[str] = []


class ProfileOut(ProfileCreate):
    id: str
    user_id: str

    class Config:
        from_attributes = True


class DiscoverProfile(BaseModel):
    id: str
    user_id: str
    first_name: str
    last_name: Optional[str] = None
    age: int
    gender: str
    orientation: str
    pronouns: Optional[str] = None
    bio: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    job_title: Optional[str] = None
    school: Optional[str] = None
    height_cm: Optional[int] = None
    looking_for: Optional[str] = None
    interests: List[str] = []
    photos: List[str] = []

    class Config:
        from_attributes = True
