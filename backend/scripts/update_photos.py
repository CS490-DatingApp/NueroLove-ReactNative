"""
update_photos.py — Replace low-res randomuser.me photos with high-res pravatar.cc (500x500).
Run from backend directory:  python scripts/update_photos.py
"""

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import firebase_admin
from firebase_admin import credentials, firestore

cred = credentials.Certificate("firebase-adminsdk.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

# pravatar.cc/500?img=N  — 500x500 portrait photos
PHOTO_MAP = {
    "emma.carter@neruo.dev":   ["https://i.pravatar.cc/500?img=47"],
    "sofia.reyes@neruo.dev":   ["https://i.pravatar.cc/500?img=49"],
    "maya.patel@neruo.dev":    ["https://i.pravatar.cc/500?img=45"],
    "lily.chen@neruo.dev":     ["https://i.pravatar.cc/500?img=48"],
    "zoe.williams@neruo.dev":  ["https://i.pravatar.cc/500?img=44"],
    "aria.johnson@neruo.dev":  ["https://i.pravatar.cc/500?img=46"],
    "jake.morgan@neruo.dev":   ["https://i.pravatar.cc/500?img=52"],
    "marcus.davis@neruo.dev":  ["https://i.pravatar.cc/500?img=57"],
}

docs = list(db.collection("profiles").stream())
updated = 0

for doc in docs:
    email = doc.to_dict().get("email", "")
    if email in PHOTO_MAP:
        db.collection("profiles").document(doc.id).update({"photos": PHOTO_MAP[email]})
        print(f"  ✓ Updated photos for {email}")
        updated += 1

print(f"\nDone — updated {updated} profiles.")
