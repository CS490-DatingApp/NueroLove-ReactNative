from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import auth, chat, conversations, matches, onboarding, profiles, safety

app = FastAPI(title="Neruo API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(profiles.router)
app.include_router(matches.router)
app.include_router(chat.router)
app.include_router(onboarding.router)
app.include_router(safety.router)
app.include_router(conversations.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
