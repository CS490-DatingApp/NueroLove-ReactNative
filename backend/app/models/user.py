import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String, nullable=False)
    onboarding_completed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="0")
    onboarding_chat: Mapped[list] = mapped_column(JSON, nullable=True, default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    profile: Mapped["Profile"] = relationship("Profile", back_populates="user", uselist=False)


class Profile(Base):
    __tablename__ = "profiles"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), unique=True, nullable=False)

    first_name: Mapped[str] = mapped_column(String, nullable=False)
    last_name: Mapped[str] = mapped_column(String, nullable=True)
    age: Mapped[int] = mapped_column(Integer, nullable=False)
    gender: Mapped[str] = mapped_column(String, nullable=False)
    orientation: Mapped[str] = mapped_column(String, nullable=False)
    pronouns: Mapped[str] = mapped_column(String, nullable=True)
    bio: Mapped[str] = mapped_column(Text, nullable=True)
    city: Mapped[str] = mapped_column(String, nullable=True)
    state: Mapped[str] = mapped_column(String, nullable=True)
    job_title: Mapped[str] = mapped_column(String, nullable=True)
    school: Mapped[str] = mapped_column(String, nullable=True)
    height_cm: Mapped[int] = mapped_column(Integer, nullable=True)
    looking_for: Mapped[str] = mapped_column(String, nullable=True)
    interests: Mapped[list] = mapped_column(JSON, default=list)
    photos: Mapped[list] = mapped_column(JSON, default=list)

    user: Mapped["User"] = relationship("User", back_populates="profile")
