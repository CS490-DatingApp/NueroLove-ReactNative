"""
generate_docs_pdf.py — Generates Neruo_App_Documentation.pdf

Produces a single self-contained PDF that:
  1. Describes the whole Neruo app (backend + React Native frontend)
  2. Lists the API surface, data models, screens, and navigation flow
  3. Proposes a roadmap of additional changes / improvements

Run:
    python3 scripts/generate_docs_pdf.py
"""

from pathlib import Path

from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    PageBreak,
    Table,
    TableStyle,
    ListFlowable,
    ListItem,
)

# ──────────────────────────────────────────────────────────────────────────
# Output path
# ──────────────────────────────────────────────────────────────────────────
ROOT = Path(__file__).resolve().parent.parent
OUT_PATH = ROOT / "Neruo_App_Documentation.pdf"

# ──────────────────────────────────────────────────────────────────────────
# Palette (matches the app's Purple theme)
# ──────────────────────────────────────────────────────────────────────────
PURPLE = colors.HexColor("#6C5CE7")
PURPLE_DARK = colors.HexColor("#4A3FBF")
PURPLE_FAINT = colors.HexColor("#F3F1FE")
GREY_900 = colors.HexColor("#111111")
GREY_700 = colors.HexColor("#333333")
GREY_500 = colors.HexColor("#666666")
GREY_300 = colors.HexColor("#BBBBBB")
GREY_100 = colors.HexColor("#F5F5F5")
BORDER = colors.HexColor("#E5E5E5")
GREEN = colors.HexColor("#10B981")
AMBER = colors.HexColor("#F59E0B")
RED = colors.HexColor("#EF4444")

# ──────────────────────────────────────────────────────────────────────────
# Styles
# ──────────────────────────────────────────────────────────────────────────
base = getSampleStyleSheet()

styles = {
    "cover_brand": ParagraphStyle(
        "cover_brand",
        parent=base["Normal"],
        fontName="Helvetica-Bold",
        fontSize=56,
        textColor=PURPLE,
        alignment=1,
        leading=60,
        spaceAfter=4,
    ),
    "cover_title": ParagraphStyle(
        "cover_title",
        parent=base["Normal"],
        fontName="Helvetica-Bold",
        fontSize=26,
        textColor=GREY_900,
        alignment=1,
        spaceAfter=8,
    ),
    "cover_sub": ParagraphStyle(
        "cover_sub",
        parent=base["Normal"],
        fontName="Helvetica",
        fontSize=14,
        textColor=GREY_500,
        alignment=1,
        spaceAfter=4,
    ),
    "cover_meta": ParagraphStyle(
        "cover_meta",
        parent=base["Normal"],
        fontName="Helvetica-Oblique",
        fontSize=11,
        textColor=GREY_500,
        alignment=1,
    ),
    "h1": ParagraphStyle(
        "h1",
        parent=base["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=22,
        textColor=PURPLE_DARK,
        spaceBefore=10,
        spaceAfter=10,
        leading=26,
    ),
    "h2": ParagraphStyle(
        "h2",
        parent=base["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=15,
        textColor=GREY_900,
        spaceBefore=14,
        spaceAfter=6,
        leading=20,
    ),
    "h3": ParagraphStyle(
        "h3",
        parent=base["Heading3"],
        fontName="Helvetica-Bold",
        fontSize=12,
        textColor=PURPLE_DARK,
        spaceBefore=10,
        spaceAfter=4,
        leading=16,
    ),
    "body": ParagraphStyle(
        "body",
        parent=base["Normal"],
        fontName="Helvetica",
        fontSize=10.5,
        textColor=GREY_700,
        leading=15,
        spaceAfter=6,
    ),
    "body_small": ParagraphStyle(
        "body_small",
        parent=base["Normal"],
        fontName="Helvetica",
        fontSize=9.5,
        textColor=GREY_700,
        leading=13,
        spaceAfter=4,
    ),
    "bullet": ParagraphStyle(
        "bullet",
        parent=base["Normal"],
        fontName="Helvetica",
        fontSize=10.5,
        textColor=GREY_700,
        leading=15,
        leftIndent=14,
        bulletIndent=2,
        spaceAfter=2,
    ),
    "code": ParagraphStyle(
        "code",
        parent=base["Normal"],
        fontName="Courier",
        fontSize=9,
        textColor=GREY_900,
        backColor=GREY_100,
        leading=12,
        borderPadding=6,
        spaceAfter=6,
        spaceBefore=2,
    ),
    "muted": ParagraphStyle(
        "muted",
        parent=base["Normal"],
        fontName="Helvetica-Oblique",
        fontSize=9,
        textColor=GREY_500,
        leading=12,
    ),
    "tag": ParagraphStyle(
        "tag",
        parent=base["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8,
        textColor=PURPLE_DARK,
        leading=10,
    ),
}


# ──────────────────────────────────────────────────────────────────────────
# Helper builders
# ──────────────────────────────────────────────────────────────────────────
def p(text: str, style: str = "body"):
    return Paragraph(text, styles[style])


def bullets(items):
    return ListFlowable(
        [ListItem(Paragraph(it, styles["bullet"]), leftIndent=14, value="•") for it in items],
        bulletType="bullet",
        bulletColor=PURPLE,
        leftIndent=10,
        spaceAfter=8,
    )


def code_block(text: str):
    """Render a fenced code block inside a grey rounded box."""
    escaped = (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace("\n", "<br/>")
        .replace("  ", "&nbsp;&nbsp;")
    )
    return Paragraph(f'<font face="Courier" size="9">{escaped}</font>', styles["code"])


def section_divider():
    t = Table([[" "]], colWidths=[6.5 * inch], rowHeights=[0.02 * inch])
    t.setStyle(
        TableStyle(
            [("BACKGROUND", (0, 0), (-1, -1), PURPLE), ("LINEBELOW", (0, 0), (-1, -1), 0, PURPLE)]
        )
    )
    return t


def info_callout(label: str, text: str, color=PURPLE):
    t = Table(
        [
            [Paragraph(f"<b>{label}</b>", styles["tag"])],
            [Paragraph(text, styles["body_small"])],
        ],
        colWidths=[6.5 * inch],
    )
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), PURPLE_FAINT),
                ("LEFTPADDING", (0, 0), (-1, -1), 12),
                ("RIGHTPADDING", (0, 0), (-1, -1), 12),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                ("LINEBEFORE", (0, 0), (0, -1), 3, color),
                ("BOX", (0, 0), (-1, -1), 0.5, BORDER),
            ]
        )
    )
    return t


def api_table(rows):
    header = ["Method", "Path", "Auth", "Description"]
    data = [header] + rows
    t = Table(data, colWidths=[0.7 * inch, 2.2 * inch, 0.55 * inch, 3.05 * inch])
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), PURPLE),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, 0), 9.5),
                ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
                ("FONTSIZE", (0, 1), (-1, -1), 9),
                ("FONTNAME", (0, 1), (0, -1), "Helvetica-Bold"),
                ("FONTNAME", (1, 1), (1, -1), "Courier"),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, GREY_100]),
                ("LINEBELOW", (0, 0), (-1, -1), 0.25, BORDER),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ]
        )
    )
    return t


def kv_table(rows, col_widths=None):
    col_widths = col_widths or [1.6 * inch, 4.9 * inch]
    t = Table(rows, colWidths=col_widths)
    t.setStyle(
        TableStyle(
            [
                ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                ("FONTNAME", (1, 0), (1, -1), "Helvetica"),
                ("FONTSIZE", (0, 0), (-1, -1), 9.5),
                ("TEXTCOLOR", (0, 0), (0, -1), PURPLE_DARK),
                ("TEXTCOLOR", (1, 0), (1, -1), GREY_700),
                ("ROWBACKGROUNDS", (0, 0), (-1, -1), [colors.white, GREY_100]),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("BOX", (0, 0), (-1, -1), 0.5, BORDER),
                ("LINEBELOW", (0, 0), (-1, -2), 0.25, BORDER),
            ]
        )
    )
    return t


def roadmap_table(items):
    header = ["#", "Feature", "Area", "Priority", "Effort"]
    data = [header] + items
    t = Table(data, colWidths=[0.3 * inch, 2.7 * inch, 1.0 * inch, 0.9 * inch, 0.7 * inch])

    style = [
        ("BACKGROUND", (0, 0), (-1, 0), PURPLE_DARK),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 9.5),
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 1), (-1, -1), 8.8),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, GREY_100]),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (0, 0), (0, -1), "CENTER"),
        ("ALIGN", (3, 0), (4, -1), "CENTER"),
        ("BOX", (0, 0), (-1, -1), 0.5, BORDER),
    ]
    # Color-code priority column
    for idx, row in enumerate(items, start=1):
        prio = row[3]
        color = {"Critical": RED, "High": AMBER, "Medium": PURPLE, "Low": GREY_500}.get(
            prio, GREY_500
        )
        style.append(("TEXTCOLOR", (3, idx), (3, idx), color))
        style.append(("FONTNAME", (3, idx), (3, idx), "Helvetica-Bold"))
    t.setStyle(TableStyle(style))
    return t


# ──────────────────────────────────────────────────────────────────────────
# Page templates (header / footer)
# ──────────────────────────────────────────────────────────────────────────
def _draw_page_chrome(canvas, doc):
    canvas.saveState()
    # Footer rule
    canvas.setStrokeColor(BORDER)
    canvas.setLineWidth(0.3)
    canvas.line(0.75 * inch, 0.55 * inch, 7.75 * inch, 0.55 * inch)
    # Footer text
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(GREY_500)
    canvas.drawString(0.75 * inch, 0.4 * inch, "Neruo — App Documentation")
    canvas.drawRightString(7.75 * inch, 0.4 * inch, f"Page {doc.page}")
    # Header (skip on cover)
    if doc.page > 1:
        canvas.setFont("Helvetica-Bold", 9)
        canvas.setFillColor(PURPLE)
        canvas.drawString(0.75 * inch, 10.55 * inch, "neuro")
        canvas.setFillColor(GREY_500)
        canvas.setFont("Helvetica", 8)
        canvas.drawRightString(7.75 * inch, 10.55 * inch, "AI-first dating app")
        canvas.setStrokeColor(BORDER)
        canvas.line(0.75 * inch, 10.42 * inch, 7.75 * inch, 10.42 * inch)
    canvas.restoreState()


# ──────────────────────────────────────────────────────────────────────────
# Build document
# ──────────────────────────────────────────────────────────────────────────
def build():
    doc = SimpleDocTemplate(
        str(OUT_PATH),
        pagesize=LETTER,
        leftMargin=0.75 * inch,
        rightMargin=0.75 * inch,
        topMargin=0.9 * inch,
        bottomMargin=0.75 * inch,
        title="Neruo — App Documentation",
        author="Neruo Team",
    )

    story = []

    # ─── Cover page ─────────────────────────────────────────────────────
    story.append(Spacer(1, 2.0 * inch))
    story.append(Paragraph("neuro", styles["cover_brand"]))
    story.append(Spacer(1, 0.15 * inch))
    story.append(Paragraph("App Documentation &amp; Roadmap", styles["cover_title"]))
    story.append(Spacer(1, 0.1 * inch))
    story.append(Paragraph("AI-first dating app · React Native + FastAPI", styles["cover_sub"]))
    story.append(Spacer(1, 0.5 * inch))
    story.append(section_divider())
    story.append(Spacer(1, 0.3 * inch))
    story.append(
        Paragraph(
            "A complete technical overview of the existing product plus a roadmap of "
            "additional features, engineering improvements, and production-readiness items.",
            styles["cover_sub"],
        )
    )
    story.append(Spacer(1, 1.5 * inch))
    story.append(Paragraph("Version 1.0 · Generated from source", styles["cover_meta"]))
    story.append(PageBreak())

    # ─── Table of Contents ──────────────────────────────────────────────
    story.append(Paragraph("Table of Contents", styles["h1"]))
    story.append(section_divider())
    story.append(Spacer(1, 0.2 * inch))
    toc_rows = [
        ["1", "Executive Summary"],
        ["2", "Architecture Overview"],
        ["3", "Backend (FastAPI)"],
        ["4", "Mobile App (React Native / Expo)"],
        ["5", "Data Models &amp; Schemas"],
        ["6", "API Reference"],
        ["7", "User Flows"],
        ["8", "Environment &amp; Run Scripts"],
        ["9", "Known Gaps &amp; Risks"],
        ["10", "Roadmap — Additional Changes to Add"],
        ["11", "Prioritized Feature Backlog"],
        ["12", "Production Readiness Checklist"],
    ]
    toc_table = Table(toc_rows, colWidths=[0.5 * inch, 6.0 * inch])
    toc_table.setStyle(
        TableStyle(
            [
                ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                ("TEXTCOLOR", (0, 0), (0, -1), PURPLE),
                ("FONTNAME", (1, 0), (1, -1), "Helvetica"),
                ("TEXTCOLOR", (1, 0), (1, -1), GREY_700),
                ("FONTSIZE", (0, 0), (-1, -1), 11),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 10),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
                ("LINEBELOW", (0, 0), (-1, -2), 0.25, BORDER),
            ]
        )
    )
    story.append(toc_table)
    story.append(PageBreak())

    # ─── 1. Executive Summary ───────────────────────────────────────────
    story.append(Paragraph("1. Executive Summary", styles["h1"]))
    story.append(section_divider())
    story.append(Spacer(1, 0.1 * inch))
    story.append(
        p(
            "Neruo is an AI-first dating application. It pairs a React Native "
            "(Expo Router) mobile client with a FastAPI backend. Instead of the "
            "usual swipe-first pattern, users are <b>gated through an AI chat "
            "onboarding</b> with the in-app assistant (\"Neruo AI\") before they can "
            "enter the main product. Once onboarded, they can browse profiles, "
            "like other users, and continue coaching conversations with the AI."
        )
    )
    story.append(Spacer(1, 0.1 * inch))
    story.append(
        info_callout(
            "PRODUCT THESIS",
            "People create better profiles — and match better — when an AI "
            "helps them articulate who they are up front. Neruo uses a mandatory "
            "short AI conversation as both an onboarding ritual and a context "
            "source for downstream recommendations.",
        )
    )
    story.append(Spacer(1, 0.15 * inch))
    story.append(Paragraph("Key capabilities today", styles["h3"]))
    story.append(
        bullets(
            [
                "Email + password auth with 30-day JWTs (HS256) stored in SecureStore.",
                "5-step profile sign-up: account → basics → about → interests → photos.",
                "Mandatory AI onboarding chat (≥5 exchanges) before app unlock.",
                "Discovery feed with shared-interest compatibility %.",
                "Like → mutual-like match detection.",
                "Persistent Neruo AI coaching chat available from Home and Messages.",
                "Profile editing with photos, interests, bio, location, job, school.",
            ]
        )
    )
    story.append(Paragraph("Tech stack at a glance", styles["h3"]))
    story.append(
        kv_table(
            [
                ["Mobile", "React Native 0.81, Expo SDK 54, Expo Router 6, TypeScript 5.9"],
                ["State", "React Context (Auth, Chat); SecureStore for persistence"],
                ["Forms", "Formik 2 + Yup 1"],
                ["Backend", "FastAPI 0.115, Uvicorn, Pydantic 2"],
                ["Database", "SQLAlchemy 2 async + aiosqlite (SQLite, zero-config)"],
                ["Auth", "python-jose (JWT HS256), passlib/bcrypt"],
                ["AI", "OpenAI gpt-4o-mini via async client (backend proxy)"],
                ["Media", "expo-image-picker, expo-image"],
            ]
        )
    )
    story.append(PageBreak())

    # ─── 2. Architecture Overview ───────────────────────────────────────
    story.append(Paragraph("2. Architecture Overview", styles["h1"]))
    story.append(section_divider())
    story.append(Spacer(1, 0.1 * inch))
    story.append(
        p(
            "The system is a classic two-tier mobile + API architecture. "
            "All AI calls are <b>proxied through the backend</b> so the OpenAI "
            "key never ships to the client. The mobile app talks to the API over "
            "HTTP/JSON using <code>EXPO_PUBLIC_API_BASE_URL</code>."
        )
    )

    ascii_diagram = (
        "┌──────────────────────────────┐        ┌──────────────────────────────┐\n"
        "│   React Native (Expo)        │        │   FastAPI Backend            │\n"
        "│   my-app/                    │        │   backend/app/               │\n"
        "│                              │        │                              │\n"
        "│   (auth) sign-in / sign-up   │        │   /auth      (register/login)│\n"
        "│   onboarding  (AI gate)      │ HTTPS  │   /profiles  (me, upsert)    │\n"
        "│   (tabs) home/explore/       │◄──────►│   /matches   (discover/like) │\n"
        "│         messages/profile     │  JSON  │   /chat      (OpenAI proxy)  │\n"
        "│   chat (coaching)            │        │   /health                    │\n"
        "│                              │        │                              │\n"
        "│   AuthProvider ─► SecureStore│        │   SQLAlchemy ─► SQLite       │\n"
        "│   ChatProvider ─► in-memory  │        │   JWT ─► Authorization hdr   │\n"
        "└──────────────────────────────┘        └──────────────┬───────────────┘\n"
        "                                                       │\n"
        "                                                       ▼\n"
        "                                                ┌──────────────┐\n"
        "                                                │ OpenAI API   │\n"
        "                                                │ gpt-4o-mini  │\n"
        "                                                └──────────────┘"
    )
    story.append(code_block(ascii_diagram))
    story.append(Spacer(1, 0.1 * inch))
    story.append(Paragraph("Repository layout", styles["h3"]))
    tree = (
        "Neruo-ReactNative/\n"
        "├── backend/\n"
        "│   ├── app/\n"
        "│   │   ├── main.py          # FastAPI app + router mounts + CORS\n"
        "│   │   ├── config.py        # pydantic-settings (.env loader)\n"
        "│   │   ├── database.py      # async engine, init_db, migrations\n"
        "│   │   ├── dependencies.py  # get_db, get_current_user (JWT)\n"
        "│   │   ├── models/          # SQLAlchemy ORM (user, profile, like)\n"
        "│   │   ├── schemas/         # Pydantic DTOs (auth, profile, chat)\n"
        "│   │   └── routers/         # auth, profiles, matches, chat\n"
        "│   ├── requirements.txt\n"
        "│   ├── run.sh\n"
        "│   └── neuro.db             # SQLite, auto-created\n"
        "└── my-app/                  # Expo Router app\n"
        "    ├── app/                 # File-based routes\n"
        "    │   ├── _layout.tsx      # Root + NavigationGuard\n"
        "    │   ├── (auth)/          # sign-in, sign-up\n"
        "    │   ├── (tabs)/          # home, explore, matches, settings\n"
        "    │   ├── onboarding.tsx   # AI onboarding gate\n"
        "    │   └── chat.tsx         # AI coaching chat\n"
        "    ├── components/          # UI + chat-bubbles + ui/*\n"
        "    ├── constants/           # theme, profile options\n"
        "    ├── context/             # AuthProvider, ChatContext\n"
        "    ├── types/               # auth, chat, profile\n"
        "    ├── app.json             # Expo config (plugins, permissions)\n"
        "    └── package.json"
    )
    story.append(code_block(tree))
    story.append(PageBreak())

    # ─── 3. Backend (FastAPI) ───────────────────────────────────────────
    story.append(Paragraph("3. Backend (FastAPI)", styles["h1"]))
    story.append(section_divider())
    story.append(Spacer(1, 0.05 * inch))

    story.append(Paragraph("Module responsibilities", styles["h3"]))
    story.append(
        kv_table(
            [
                [
                    "main.py",
                    "Instantiates FastAPI (title: \"Neuro API\", v1.0.0), wires CORS (currently <b>allow_origins=\"*\"</b>), mounts routers at /auth, /profiles, /matches, /chat, exposes /health, runs init_db on startup via lifespan.",
                ],
                [
                    "config.py",
                    "pydantic-settings loading from .env: openai_api_key, jwt_secret, database_url, jwt_algorithm (HS256), jwt_expire_days (30).",
                ],
                [
                    "database.py",
                    "Async SQLAlchemy engine (aiosqlite), AsyncSessionLocal, DeclarativeBase. init_db creates tables and additively runs ALTER statements for onboarding_completed / onboarding_chat columns to stay backward-compatible with earlier DBs.",
                ],
                [
                    "dependencies.py",
                    "HTTPBearer security scheme. get_db yields an AsyncSession per request. get_current_user decodes the JWT, loads User by id, raises 401 on failure.",
                ],
                [
                    "routers/auth.py",
                    "POST /auth/register and /auth/login. Passwords hashed with bcrypt; JWTs signed with jose. Both return { token, user }.",
                ],
                [
                    "routers/profiles.py",
                    "POST /profiles/me (upsert) and GET /profiles/me. Tied to the authenticated user.",
                ],
                [
                    "routers/matches.py",
                    "GET /matches/discover (all profiles minus self and already-liked, shuffled). POST /matches/{user_id}/like (idempotent; returns { match: bool } on mutual).",
                ],
                [
                    "routers/chat.py",
                    "POST /chat (OpenAI gpt-4o-mini proxy with two personas: onboarding, coaching; temperature 0.85/0.8). POST /chat/onboarding/save persists the transcript and sets onboarding_completed=true.",
                ],
            ]
        )
    )

    story.append(Paragraph("Key runtime characteristics", styles["h3"]))
    story.append(
        bullets(
            [
                "Fully async request path: SQLAlchemy async sessions + AsyncOpenAI client.",
                "Stateless auth: every protected route depends on get_current_user.",
                "Idempotent likes guarded by uq_like unique constraint on (liker_id, liked_id).",
                "Soft schema migrations in init_db via ALTER TABLE … ADD COLUMN (wrapped in try/except).",
                "System prompts are server-side — clients can only choose a context label and pass interests.",
            ]
        )
    )
    story.append(PageBreak())

    # ─── 4. Mobile App ──────────────────────────────────────────────────
    story.append(Paragraph("4. Mobile App (React Native / Expo)", styles["h1"]))
    story.append(section_divider())
    story.append(Spacer(1, 0.05 * inch))

    story.append(Paragraph("Navigation model", styles["h3"]))
    story.append(
        p(
            "Routing is file-based via expo-router. A single <b>NavigationGuard</b> "
            "component in <code>app/_layout.tsx</code> is the single source of truth "
            "for which section the user belongs in. It reads auth state and URL "
            "segments, and redirects <i>inside a useEffect</i> (never during render) "
            "to avoid update-depth loops."
        )
    )
    story.append(
        code_block(
            "Not logged in               → (auth)/sign-in\n"
            "Logged in, onboarding done  → (tabs)/\n"
            "Logged in, no onboarding    → /onboarding"
        )
    )

    story.append(Paragraph("Screens", styles["h3"]))
    story.append(
        kv_table(
            [
                ["(auth)/sign-in.tsx", "Email + password form (Formik/Yup) → POST /auth/login."],
                [
                    "(auth)/sign-up.tsx",
                    "5-step flow: account → basics → about → interests → photos. Step 0 creates the account (POST /auth/register); the last step saves the profile (POST /profiles/me). Photos via expo-image-picker.",
                ],
                [
                    "onboarding.tsx",
                    "AI gate. Seeds a welcome message, counts user replies, unlocks the app at MIN_EXCHANGES (5). On unlock, POSTs the transcript to /chat/onboarding/save and navigates to (tabs).",
                ],
                [
                    "(tabs)/index.tsx (Home)",
                    "Greeting + three quick-action cards (AI coach, Discover, Messages) + tip banner.",
                ],
                [
                    "(tabs)/explore.tsx (Discover)",
                    "Grid of profiles from /matches/discover. Computes compatibility % via Jaccard on interests. Falls back to mock data if API down. Detail modal with Like button.",
                ],
                [
                    "(tabs)/matches.tsx (Messages)",
                    "Shows the Neruo AI conversation row + Discover shortcut + logout footer.",
                ],
                [
                    "(tabs)/settings.tsx (Profile)",
                    "Fetch + edit profile. Photos, interests, bio, location, job, school. Save button only shows when form is dirty.",
                ],
                [
                    "chat.tsx",
                    "Ongoing AI coaching chat. Shares ChatContext with onboarding. Calls /chat with context: \"coaching\".",
                ],
            ]
        )
    )

    story.append(Paragraph("Context providers", styles["h3"]))
    story.append(
        bullets(
            [
                "<b>AuthProvider</b> — Persists { token, user } to expo-secure-store; exposes login / register / logout / markOnboardingComplete.",
                "<b>ChatContext</b> — In-memory message list shared between onboarding and coaching screens. <code>clearMessages()</code> is invoked by NavigationGuard on user change so chats never leak across accounts.",
            ]
        )
    )

    story.append(Paragraph("Design system", styles["h3"]))
    story.append(
        bullets(
            [
                "Purple brand palette in <code>constants/theme</code> (Purple.primary, faint, border).",
                "Shared primitives: Button, Input, ScreenHeader, MessageBubble, TypingIndicator, HapticTab.",
                "Themed (light/dark) via @react-navigation/native + useColorScheme.",
                "React Compiler + typed routes enabled in app.json (experiments).",
            ]
        )
    )
    story.append(PageBreak())

    # ─── 5. Data Models ─────────────────────────────────────────────────
    story.append(Paragraph("5. Data Models & Schemas", styles["h1"]))
    story.append(section_divider())
    story.append(Spacer(1, 0.1 * inch))

    story.append(Paragraph("users (User model)", styles["h3"]))
    story.append(
        kv_table(
            [
                ["id", "str (UUID4) — primary key"],
                ["email", "str unique, indexed, not null"],
                ["password_hash", "str (bcrypt) not null"],
                ["onboarding_completed", "bool default false"],
                ["onboarding_chat", "JSON list of {role, text} or null"],
                ["created_at", "datetime (utcnow) default"],
                ["profile", "relationship → Profile (1:1)"],
            ]
        )
    )
    story.append(Paragraph("profiles (Profile model)", styles["h3"]))
    story.append(
        kv_table(
            [
                ["id", "str (UUID4) — primary key"],
                ["user_id", "FK users.id, unique"],
                ["first_name", "str (required)"],
                ["last_name", "str (optional)"],
                ["age", "int 18–99"],
                ["gender", "str (Man / Woman / Non-binary / Other)"],
                ["orientation", "str (Straight / Gay / Lesbian / Bi / Pan / Ace / Other)"],
                ["pronouns", "str (optional)"],
                ["bio", "text, max 300 chars"],
                ["city, state", "str (optional)"],
                ["job_title, school", "str (optional)"],
                ["height_cm", "int (optional)"],
                ["looking_for", "str (Relationship / Casual / Friends / Not sure)"],
                ["interests", "JSON list[str]"],
                ["photos", "JSON list[str] (local URIs today)"],
            ]
        )
    )
    story.append(Paragraph("likes (Like model)", styles["h3"]))
    story.append(
        kv_table(
            [
                ["id", "str (UUID4)"],
                ["liker_id", "FK users.id"],
                ["liked_id", "FK users.id"],
                ["created_at", "datetime default utcnow"],
                ["uq_like", "UNIQUE(liker_id, liked_id)"],
            ]
        )
    )
    story.append(PageBreak())

    # ─── 6. API Reference ───────────────────────────────────────────────
    story.append(Paragraph("6. API Reference", styles["h1"]))
    story.append(section_divider())
    story.append(Spacer(1, 0.1 * inch))
    story.append(
        p(
            "All protected endpoints require an <code>Authorization: Bearer &lt;jwt&gt;</code> "
            "header. Tokens are minted by /auth/register and /auth/login."
        )
    )

    story.append(
        api_table(
            [
                ["POST", "/auth/register", "No", "Create account; returns { token, user }"],
                ["POST", "/auth/login", "No", "Authenticate; returns { token, user }"],
                ["POST", "/profiles/me", "Yes", "Upsert profile for current user"],
                ["GET", "/profiles/me", "Yes", "Fetch current user's profile"],
                ["GET", "/matches/discover", "Yes", "List profiles (excl. self + liked)"],
                ["POST", "/matches/{user_id}/like", "Yes", "Like user; returns { match: bool }"],
                ["POST", "/chat", "Yes", "AI proxy (onboarding / coaching contexts)"],
                ["POST", "/chat/onboarding/save", "Yes", "Persist transcript + unlock app"],
                ["GET", "/health", "No", "Liveness check"],
            ]
        )
    )
    story.append(Spacer(1, 0.15 * inch))
    story.append(Paragraph("Example: Chat request", styles["h3"]))
    story.append(
        code_block(
            'POST /chat\n'
            'Authorization: Bearer <jwt>\n'
            'Content-Type: application/json\n\n'
            '{\n'
            '  "messages": [\n'
            '    {"role": "assistant", "text": "Welcome to Neruo!"},\n'
            '    {"role": "user", "text": "I love hiking and jazz"}\n'
            '  ],\n'
            '  "context": "onboarding",\n'
            '  "interests": ["Hiking", "Music"]\n'
            '}'
        )
    )
    story.append(PageBreak())

    # ─── 7. User Flows ──────────────────────────────────────────────────
    story.append(Paragraph("7. User Flows", styles["h1"]))
    story.append(section_divider())
    story.append(Spacer(1, 0.1 * inch))
    story.append(Paragraph("First-time user", styles["h3"]))
    story.append(
        code_block(
            "Launch → AuthProvider hydrates SecureStore (isLoading)\n"
            "       → NavigationGuard: no user  →  (auth)/sign-in\n"
            "Tap \"Create one\"  →  sign-up step 0 (account)\n"
            "  POST /auth/register  →  token + user persisted\n"
            "Sign-up steps 1–4 (basics, about, interests, photos)\n"
            "  POST /profiles/me  →  profile saved\n"
            "Router pushes /onboarding (AI gate)\n"
            "  ≥5 user messages to /chat (context: onboarding)\n"
            "  POST /chat/onboarding/save  →  onboarding_completed=true\n"
            "markOnboardingComplete() → NavigationGuard → (tabs)/"
        )
    )
    story.append(Paragraph("Returning user", styles["h3"]))
    story.append(
        code_block(
            "Launch → SecureStore hydrates → user present & onboarded\n"
            "       → NavigationGuard → (tabs)/\n"
            "       → Home / Explore / Messages / Profile"
        )
    )
    story.append(Paragraph("Discover → Like → Match", styles["h3"]))
    story.append(
        code_block(
            "Explore tab  →  GET /matches/discover\n"
            "Tap profile  →  ProfileDetailModal\n"
            "Tap Like     →  POST /matches/{user_id}/like\n"
            "              →  { match: true } if mutual"
        )
    )
    story.append(PageBreak())

    # ─── 8. Env & Run ───────────────────────────────────────────────────
    story.append(Paragraph("8. Environment & Run Scripts", styles["h1"]))
    story.append(section_divider())
    story.append(Spacer(1, 0.1 * inch))

    story.append(Paragraph("Backend", styles["h3"]))
    story.append(
        code_block(
            "cd backend\n"
            "python -m venv venv\n"
            "source venv/bin/activate   # Windows: venv\\Scripts\\activate\n"
            "pip install -r requirements.txt\n"
            "uvicorn app.main:app --reload --port 8000\n"
            "# Docs: http://localhost:8000/docs"
        )
    )
    story.append(Paragraph("Backend .env", styles["h3"]))
    story.append(
        code_block(
            "OPENAI_API_KEY=sk-...\n"
            "JWT_SECRET=<long-random-string>\n"
            "DATABASE_URL=sqlite+aiosqlite:///./neuro.db"
        )
    )
    story.append(Paragraph("Mobile app", styles["h3"]))
    story.append(
        code_block(
            "cd my-app\n"
            "npm install\n"
            "# .env\n"
            "#   EXPO_PUBLIC_API_BASE_URL=http://<your-lan-ip>:8000\n"
            "npx expo start                # or npm run ios / android / web"
        )
    )
    story.append(PageBreak())

    # ─── 9. Gaps & Risks ────────────────────────────────────────────────
    story.append(Paragraph("9. Known Gaps & Risks", styles["h1"]))
    story.append(section_divider())
    story.append(Spacer(1, 0.1 * inch))
    story.append(
        bullets(
            [
                "<b>Photos are local URIs.</b> Profile photos saved from ImagePicker are not uploaded anywhere; they won't render on other devices. Needs object storage + upload endpoint.",
                "<b>CORS is wide-open.</b> <code>allow_origins=[\"*\"]</code> in main.py is fine for dev, unsafe for production.",
                "<b>Default JWT secret.</b> <code>config.py</code> defaults to \"dev-secret-change-in-production\". Must be rotated and enforced before launch.",
                "<b>Email uniqueness only at DB level.</b> No email verification or password reset.",
                "<b>No pagination</b> on /matches/discover — entire Profile table is loaded and shuffled in Python.",
                "<b>No matches endpoint</b> on the server (the Messages tab only shows the AI row; mutual matches are not listed yet).",
                "<b>No realtime chat</b> between users; only user ↔ AI.",
                "<b>No rate limiting</b> on /chat — a user can burn OpenAI tokens freely.",
                "<b>SQLite</b> is embedded; multi-instance deployments would need Postgres.",
                "<b>ALTER TABLE \"migrations\"</b> live in init_db — works now but won't scale past a handful of schema changes (Alembic is the right call).",
                "<b>No analytics / crash reporting</b> wired up (Sentry, PostHog, etc.).",
                "<b>No tests.</b> No unit, integration, or E2E tests exist in either package.",
            ]
        )
    )
    story.append(PageBreak())

    # ─── 10. Roadmap Changes ────────────────────────────────────────────
    story.append(Paragraph("10. Roadmap — Additional Changes to Add", styles["h1"]))
    story.append(section_divider())
    story.append(Spacer(1, 0.1 * inch))
    story.append(
        p(
            "The features below are grouped by theme. Each is described at a "
            "product level with a brief implementation note. Priorities and "
            "effort estimates are in Section 11."
        )
    )

    # --- Core dating features
    story.append(Paragraph("A. Core dating features", styles["h2"]))
    story.append(
        bullets(
            [
                "<b>Real user-to-user chat.</b> A /conversations and /messages REST surface plus a WebSocket channel (FastAPI's native WS support) for realtime delivery. New Conversation + Message models, read receipts, typing indicators.",
                "<b>Mutual Matches list.</b> Add GET /matches/mine returning users who both liked each other. Replace the placeholder Messages tab content with a list of active matches.",
                "<b>Pass / Unlike.</b> Add a Pass table (or a status column on Like) so users can skip without blocking later re-discovery; undo last action.",
                "<b>Super-like / priority.</b> One per day; surfaces the liker at the top of the target's feed.",
                "<b>Distance &amp; filters.</b> Store lat/lng, add radius + age-range + gender filters on /matches/discover with server-side pagination (cursor or offset).",
                "<b>Profile prompts &amp; voice notes.</b> Add a JSON prompts field (e.g. \"A perfect Sunday looks like…\") and short audio clips to enrich profiles beyond bio + photos.",
                "<b>Verified profiles.</b> Selfie-vs-photo verification using a third-party ID provider; a verified badge on the card.",
                "<b>Reporting &amp; blocking.</b> POST /users/{id}/report, POST /users/{id}/block; blocked users never appear in discovery.",
            ]
        )
    )

    # --- AI
    story.append(Paragraph("B. AI & assistant", styles["h2"]))
    story.append(
        bullets(
            [
                "<b>Streaming responses</b> from /chat via Server-Sent Events or WebSocket — huge UX win, GPT responses arrive token-by-token.",
                "<b>Personalised system prompt</b> that folds in bio + interests + recent match context, so coaching advice is actually tailored.",
                "<b>Conversation summaries</b>: periodically summarise long coaching threads to keep prompt cost flat.",
                "<b>AI-drafted openers</b>: given a mutual match, Neruo AI proposes 3 opener lines based on the other person's profile.",
                "<b>AI bio generator</b>: interview-style flow in the Profile editor that rewrites the user's bio from their answers.",
                "<b>Moderation</b>: run every user message through OpenAI's moderation endpoint before/after calling the model.",
                "<b>Provider abstraction</b>: swap OpenAI for Anthropic (Claude), Azure OpenAI, or a local model via a single Provider interface.",
                "<b>Token-usage accounting</b>: per-user daily cap; persist tokens_in / tokens_out per /chat call.",
            ]
        )
    )

    # --- Backend / infra
    story.append(Paragraph("C. Backend & infra", styles["h2"]))
    story.append(
        bullets(
            [
                "<b>Alembic migrations</b> replacing the ALTER TABLE block in init_db.",
                "<b>Postgres in production</b> — keep SQLite for local dev behind the DATABASE_URL switch.",
                "<b>S3/R2 photo uploads</b>: POST /photos to get a presigned URL, store only the object key on the Profile.",
                "<b>Image processing</b>: auto-crop / face-detect / generate small, medium, large variants on upload.",
                "<b>Rate limiting &amp; abuse control</b> with slowapi or a Redis token bucket, applied especially to /chat.",
                "<b>Structured logging</b> (structlog / loguru) with request IDs, and OpenTelemetry traces.",
                "<b>CORS lockdown</b>: whitelist the app's origins + an ENV flag for staging/prod.",
                "<b>Refresh tokens</b> + short-lived access tokens; rotate on use.",
                "<b>Email verification + password reset</b> (magic link) — SendGrid/Resend on the send side.",
                "<b>Background jobs</b> (arq or Celery + Redis) for image processing, match notifications, weekly digest emails.",
            ]
        )
    )

    # --- Mobile UX
    story.append(Paragraph("D. Mobile UX", styles["h2"]))
    story.append(
        bullets(
            [
                "<b>Push notifications</b> via expo-notifications: new match, new message, AI reminder to finish profile.",
                "<b>Skeleton loaders</b> + optimistic UI on like / send.",
                "<b>Haptics</b> on match (success) and like (light impact).",
                "<b>Pull-to-refresh</b> on Explore.",
                "<b>Offline queue</b> for outgoing messages using a small AsyncStorage buffer.",
                "<b>Dark mode polish</b>: tokenise hard-coded #fff/#111 colours into semantic theme tokens.",
                "<b>Accessibility</b>: label every Pressable, minimum 44pt targets, font-scaling pass, VoiceOver smoke test.",
                "<b>Deep linking</b>: myapp://profile/{id} + universal links for web handoff.",
                "<b>Gesture-based swipe</b> on Explore using react-native-gesture-handler + reanimated (already installed).",
            ]
        )
    )

    # --- Quality
    story.append(Paragraph("E. Quality, testing & DevOps", styles["h2"]))
    story.append(
        bullets(
            [
                "<b>Pytest</b> for backend: unit tests on routers + an async HTTPX test client; factory-boy fixtures.",
                "<b>Jest + React Native Testing Library</b> for components; <b>Detox</b> or <b>Maestro</b> for E2E happy paths.",
                "<b>Type coverage</b>: turn on TS strict mode; add ts-prune / knip to trim dead exports.",
                "<b>GitHub Actions</b> CI: lint + test + typecheck on every PR; EAS build on main.",
                "<b>Sentry</b> in mobile + backend; PostHog/Amplitude for funnel analytics.",
                "<b>Feature flags</b> via PostHog or a tiny DB-backed flag table.",
                "<b>Seed + fixtures script</b> to populate N demo profiles for local dev.",
            ]
        )
    )

    # --- Trust & safety / legal
    story.append(Paragraph("F. Trust & safety, legal", styles["h2"]))
    story.append(
        bullets(
            [
                "<b>Privacy Policy &amp; ToS</b> screens + checkbox on sign-up.",
                "<b>Age gate enforcement</b>: server-side 18+ check already exists; add date-of-birth instead of age so we can compute over time.",
                "<b>Right-to-delete</b>: DELETE /users/me that hard-deletes user, profile, likes, chats.",
                "<b>Data export</b>: GET /users/me/export returns a JSON dump of the user's data (GDPR-ready).",
                "<b>Consent &amp; tracking opt-out</b> for analytics.",
            ]
        )
    )
    story.append(PageBreak())

    # ─── 11. Prioritized Feature Backlog ────────────────────────────────
    story.append(Paragraph("11. Prioritized Feature Backlog", styles["h1"]))
    story.append(section_divider())
    story.append(Spacer(1, 0.1 * inch))
    story.append(
        p(
            "Priority and effort are rough estimates for planning purposes. "
            "Effort legend: S = ≤2 days, M = ≤1 week, L = 1–3 weeks, XL = 3+ weeks."
        )
    )
    story.append(Spacer(1, 0.08 * inch))
    story.append(
        roadmap_table(
            [
                ["1", "Photo upload to object storage (S3/R2)", "Backend+UX", "Critical", "M"],
                ["2", "Lock down CORS + rotate JWT secret", "Backend", "Critical", "S"],
                ["3", "User ↔ User chat (REST + WS)", "Backend+UX", "Critical", "XL"],
                ["4", "Mutual Matches list + Messages tab", "Backend+UX", "High", "M"],
                ["5", "Push notifications (new match / msg)", "Mobile", "High", "M"],
                ["6", "Rate limiting on /chat", "Backend", "High", "S"],
                ["7", "Streaming AI responses (SSE)", "Backend+UX", "High", "M"],
                ["8", "Moderation on user messages", "Backend", "High", "S"],
                ["9", "Discovery filters + pagination", "Backend+UX", "High", "M"],
                ["10", "Pass / Unlike + undo last", "Backend+UX", "Medium", "S"],
                ["11", "Alembic migrations", "Backend", "Medium", "S"],
                ["12", "Email verification + password reset", "Backend+UX", "Medium", "M"],
                ["13", "Report + block users", "Backend+UX", "Medium", "M"],
                ["14", "Sentry + analytics", "DevOps", "Medium", "S"],
                ["15", "AI-drafted openers", "AI+UX", "Medium", "M"],
                ["16", "AI bio generator flow", "AI+UX", "Medium", "M"],
                ["17", "Profile prompts + voice notes", "Backend+UX", "Medium", "L"],
                ["18", "Verified profile badge", "Backend+UX", "Medium", "L"],
                ["19", "Super-like", "Backend+UX", "Low", "S"],
                ["20", "Swipe gestures on Explore", "Mobile", "Low", "M"],
                ["21", "Deep links + universal links", "Mobile", "Low", "S"],
                ["22", "Data export + right-to-delete", "Backend", "Low", "M"],
            ]
        )
    )
    story.append(PageBreak())

    # ─── 12. Production Readiness ───────────────────────────────────────
    story.append(Paragraph("12. Production Readiness Checklist", styles["h1"]))
    story.append(section_divider())
    story.append(Spacer(1, 0.1 * inch))

    story.append(Paragraph("Security", styles["h3"]))
    story.append(
        bullets(
            [
                "JWT secret loaded from a secrets manager, not .env.",
                "CORS restricted to known origins.",
                "HTTPS enforced (reverse proxy / load balancer).",
                "Password reset + email verification live.",
                "Rate-limit auth endpoints + /chat.",
                "Input validation re-checked server-side on every write route.",
            ]
        )
    )
    story.append(Paragraph("Reliability", styles["h3"]))
    story.append(
        bullets(
            [
                "Postgres + connection pooling + daily backups.",
                "Alembic migrations running in CI and on deploy.",
                "Health check + readiness endpoints; autoscaling configured.",
                "Error monitoring (Sentry) for backend + mobile.",
                "Structured logs shipped to a central place (Datadog / Grafana Loki).",
            ]
        )
    )
    story.append(Paragraph("Observability", styles["h3"]))
    story.append(
        bullets(
            [
                "Request tracing with OpenTelemetry.",
                "Funnel analytics (signup → onboarding → first match).",
                "Token-usage + cost dashboard for OpenAI spend.",
                "Crash-free sessions metric from mobile.",
            ]
        )
    )
    story.append(Paragraph("Mobile release", styles["h3"]))
    story.append(
        bullets(
            [
                "EAS build + submit pipelines for iOS + Android.",
                "App Store / Play Console listings + screenshots.",
                "Privacy Policy + Terms URLs ready.",
                "OTA updates via expo-updates configured.",
                "Feature flags + kill switches for risky features.",
            ]
        )
    )

    # Build!
    doc.build(story, onFirstPage=_draw_page_chrome, onLaterPages=_draw_page_chrome)
    return OUT_PATH


if __name__ == "__main__":
    out = build()
    print(f"Wrote {out}")
