# Neuro Backend

FastAPI backend for the Neuro dating app.

## Stack

- **FastAPI** — web framework
- **SQLAlchemy async + aiosqlite** — SQLite database, zero config
- **python-jose** — JWT auth (HS256, 30-day tokens)
- **passlib[bcrypt]** — password hashing
- **openai** — AI chat proxy

## Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Edit `.env` and set your keys:

```
OPENAI_API_KEY=sk-...
JWT_SECRET=some-random-secret
DATABASE_URL=sqlite+aiosqlite:///./neuro.db
```

## Run

```bash
uvicorn app.main:app --reload --port 8000
```

Interactive docs: http://localhost:8000/docs

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | No | Create account |
| POST | `/auth/login` | No | Login |
| POST | `/profiles/me` | Yes | Create/update profile |
| GET | `/profiles/me` | Yes | Get own profile |
| GET | `/matches/discover` | Yes | Browse other profiles |
| POST | `/matches/{user_id}/like` | Yes | Like a profile |
| POST | `/chat` | Yes | AI chat proxy |
| GET | `/health` | No | Health check |

## Auth

All protected endpoints require `Authorization: Bearer <token>` header.
Tokens are returned from `/auth/register` and `/auth/login`.

## Database

SQLite file `neuro.db` is created automatically on first run in the `backend/` directory.
