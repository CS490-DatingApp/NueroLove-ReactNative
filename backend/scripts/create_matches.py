"""
create_matches.py — Create mutual matches between the real user and seeded bot profiles.

Run from the backend directory:
    python scripts/create_matches.py

What it does:
  1. Marks all seeded demo users as is_bot=True in Firestore
  2. Finds the real user (non-seeded profile)
  3. Creates mutual matches + feedback docs for 4 of the female bots
"""

import sys
import os
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import firebase_admin
from firebase_admin import credentials, firestore

cred = credentials.Certificate("firebase-adminsdk.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

BOT_EMAILS = {
    "emma.carter@neruo.dev",
    "sofia.reyes@neruo.dev",
    "maya.patel@neruo.dev",
    "lily.chen@neruo.dev",
    "zoe.williams@neruo.dev",
    "aria.johnson@neruo.dev",
    "jake.morgan@neruo.dev",
    "marcus.davis@neruo.dev",
}

# The 4 bots that will match with the real user
MATCH_EMAILS = {
    "emma.carter@neruo.dev",
    "sofia.reyes@neruo.dev",
    "maya.patel@neruo.dev",
    "zoe.williams@neruo.dev",
}

now = datetime.now(timezone.utc).isoformat()

print("Step 1: Marking seeded users as bots...")
all_profiles = list(db.collection("profiles").stream())
bot_profiles = {}   # email -> uid
real_user_uid = None
real_user_email = None

for doc in all_profiles:
    data = doc.to_dict()
    email = data.get("email", "")
    uid = data.get("uid", doc.id)
    if email in BOT_EMAILS:
        db.collection("profiles").document(doc.id).update({"is_bot": True})
        bot_profiles[email] = uid
        print(f"  ✓ Marked {email} as bot (uid: {uid[:12]}...)")
    else:
        real_user_uid = uid
        real_user_email = email
        print(f"  → Found real user: {email} (uid: {uid[:12]}...)")

if not real_user_uid:
    print("\nERROR: No real user found. Make sure you have an account registered in the app.")
    sys.exit(1)

print(f"\nStep 2: Creating mutual matches for real user ({real_user_email})...")

for email in MATCH_EMAILS:
    bot_uid = bot_profiles.get(email)
    if not bot_uid:
        print(f"  ✗ Bot not found: {email}")
        continue

    name = email.split(".")[0].capitalize()

    # Create feedback: real user liked bot
    db.collection("feedback").add({
        "from_uid": real_user_uid,
        "to_uid": bot_uid,
        "action": "like",
        "created_at": now,
    })

    # Create feedback: bot liked real user back
    db.collection("feedback").add({
        "from_uid": bot_uid,
        "to_uid": real_user_uid,
        "action": "like",
        "created_at": now,
    })

    # Create match doc (avoid duplicates)
    user_a = min(real_user_uid, bot_uid)
    user_b = max(real_user_uid, bot_uid)
    existing = (
        db.collection("matches")
        .where("user_a", "==", user_a)
        .where("user_b", "==", user_b)
        .limit(1)
        .get()
    )
    if not list(existing):
        db.collection("matches").add({
            "user_a": user_a,
            "user_b": user_b,
            "created_at": now,
        })
        print(f"  ✓ Matched with {name} ({email})")
    else:
        print(f"  → Already matched with {name}, skipping")

print(f"\nDone! Open the app and go to Messages to see your matches.")
