from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., max_length=72)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., max_length=72)


class UserOut(BaseModel):
    id: str
    email: str
    onboarding_completed: bool = False


class TokenResponse(BaseModel):
    token: str
    user: UserOut
