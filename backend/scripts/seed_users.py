"""
seed_users.py — Populate Neruo with 8 realistic fake users (6 girls, 2 guys).
Photos from randomuser.me (free, no auth needed).

Run from the backend directory:
    python scripts/seed_users.py
"""

import time
import urllib.request
import json
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

BASE_URL = "http://localhost:8000"

USERS = [
    # ── Girls (6) ──────────────────────────────────────────────────────────────
    {
        "email": "emma.carter@neruo.dev",
        "password": "Neruo2024!",
        "first_name": "Emma",
        "last_name": "Carter",
        "age": 24,
        "gender": "Female",
        "orientation": "Straight",
        "pronouns": "she/her",
        "bio": "Yoga instructor by morning, foodie by night. I'm obsessed with farmers markets, spontaneous road trips, and my rescue dog Maple. Looking for someone who can keep up on a hiking trail.",
        "city": "Los Angeles",
        "state": "CA",
        "job_title": "Yoga Instructor",
        "interests": ["Yoga", "Hiking", "Cooking", "Travel", "Dogs"],
        "looking_for": "Relationship",
        "photos": ["https://randomuser.me/api/portraits/women/44.jpg"],
        "conversation": "User: I love yoga and hiking, I have a rescue dog named Maple. AI: What kind of person are you hoping to meet? User: Someone adventurous and outdoorsy, not afraid to get dirty on a trail. AI: What do you value most in a relationship? User: Honesty and spontaneity. I hate when things get too routine. AI: Tell me more about yourself. User: I teach yoga at sunrise, shop at farmers markets on weekends, and I'm a total foodie. AI: What's your idea of a perfect date? User: A hike followed by a home-cooked meal. Simple but meaningful.",
    },
    {
        "email": "sofia.reyes@neruo.dev",
        "password": "Neruo2024!",
        "first_name": "Sofia",
        "last_name": "Reyes",
        "age": 26,
        "gender": "Female",
        "orientation": "Straight",
        "pronouns": "she/her",
        "bio": "UX designer who thinks in wireframes and dreams in color palettes. I spend weekends at art galleries, coffee shops with good playlists, and occasionally trying to keep my plants alive.",
        "city": "New York",
        "state": "NY",
        "job_title": "UX Designer",
        "interests": ["Art", "Design", "Coffee", "Music", "Travel"],
        "looking_for": "Relationship",
        "photos": ["https://randomuser.me/api/portraits/women/68.jpg"],
        "conversation": "User: I'm a UX designer, really into art and design. AI: What does your ideal weekend look like? User: Gallery hopping, then a long brunch with friends, maybe a jazz bar at night. AI: What kind of connection are you looking for? User: Someone creative and thoughtful. I love deep conversations over coffee. AI: What are you passionate about outside of work? User: I paint watercolors on Sunday mornings. It helps me decompress. AI: What would you want a partner to know about you? User: I'm introverted but very warm once I open up. I value quality over quantity in everything.",
    },
    {
        "email": "maya.patel@neruo.dev",
        "password": "Neruo2024!",
        "first_name": "Maya",
        "last_name": "Patel",
        "age": 23,
        "gender": "Female",
        "orientation": "Straight",
        "pronouns": "she/her",
        "bio": "Neuroscience PhD student who balances lab life with yoga, terrible puns, and an embarrassing love for reality TV. I believe good science and good pizza can solve most problems.",
        "city": "Boston",
        "state": "MA",
        "job_title": "PhD Student",
        "interests": ["Science", "Yoga", "Reading", "Cooking", "Music"],
        "looking_for": "Something casual",
        "photos": ["https://randomuser.me/api/portraits/women/56.jpg"],
        "conversation": "User: I'm a neuroscience PhD student, love science but also guilty reality TV. AI: What do you do to unwind after long lab days? User: Yoga or cooking something experimental. And I make terrible puns — it's a problem. AI: What kind of person clicks with you? User: Someone smart but doesn't take themselves too seriously. I love laughing. AI: What are you looking for right now? User: Honestly something casual but genuine. I'm busy with my PhD but I still want real connection. AI: What's something most people don't know about you? User: I was a competitive dancer in high school. Very different life.",
    },
    {
        "email": "lily.chen@neruo.dev",
        "password": "Neruo2024!",
        "first_name": "Lily",
        "last_name": "Chen",
        "age": 28,
        "gender": "Female",
        "orientation": "Straight",
        "pronouns": "she/her",
        "bio": "Marketing manager by day, amateur chef by night. I'm building a cookbook of recipes from my travels. If you can recommend a hidden-gem restaurant, we're already friends.",
        "city": "Chicago",
        "state": "IL",
        "job_title": "Marketing Manager",
        "interests": ["Cooking", "Travel", "Food", "Photography", "Fitness"],
        "looking_for": "Relationship",
        "photos": ["https://randomuser.me/api/portraits/women/32.jpg"],
        "conversation": "User: I love cooking and traveling — I'm building a travel cookbook. AI: What inspires your cooking? User: Each trip I take, I try to learn one local recipe. I've got 40 so far. AI: What do you value in a partner? User: Someone who's curious about the world and adventurous with food. AI: How do you spend your weekends? User: Farmer's markets, trying new restaurants, and going for long runs. AI: What are you looking for on Neruo? User: A real relationship. I'm done with situationships.",
    },
    {
        "email": "zoe.williams@neruo.dev",
        "password": "Neruo2024!",
        "first_name": "Zoe",
        "last_name": "Williams",
        "age": 25,
        "gender": "Female",
        "orientation": "Bisexual",
        "pronouns": "she/her",
        "bio": "Freelance photographer who chases golden hour and good light. When I'm not behind a lens I'm at a concert, on a bike ride, or hunting down the city's best tacos.",
        "city": "Austin",
        "state": "TX",
        "job_title": "Photographer",
        "interests": ["Photography", "Music", "Travel", "Cycling", "Food"],
        "looking_for": "Relationship",
        "photos": ["https://randomuser.me/api/portraits/women/17.jpg"],
        "conversation": "User: I'm a photographer, big into music and live concerts. AI: What does your ideal day look like? User: Shoot a sunrise, bike to a coffee shop, go to a show at night. AI: What kind of people do you connect with? User: Creative, spontaneous people who say yes to last-minute plans. AI: What are you looking for? User: Something real. I've been traveling solo a lot and I'd love someone to explore with. AI: What's something you're really proud of? User: I had photos published in a travel magazine last year. That was a dream come true.",
    },
    {
        "email": "aria.johnson@neruo.dev",
        "password": "Neruo2024!",
        "first_name": "Aria",
        "last_name": "Johnson",
        "age": 27,
        "gender": "Female",
        "orientation": "Straight",
        "pronouns": "she/her",
        "bio": "Software engineer at a climate tech startup. I care deeply about the planet, love a good debate, and will always choose hiking over brunch. Looking for someone with conviction.",
        "city": "San Francisco",
        "state": "CA",
        "job_title": "Software Engineer",
        "interests": ["Hiking", "Technology", "Environment", "Reading", "Fitness"],
        "looking_for": "Relationship",
        "photos": ["https://randomuser.me/api/portraits/women/90.jpg"],
        "conversation": "User: I'm a software engineer working in climate tech. Very passionate about the environment. AI: What drives you outside of work? User: Hiking and reading. I'm always working through a non-fiction book. AI: What kind of relationship are you looking for? User: Someone intellectually stimulating who also cares about more than just themselves. AI: What would a perfect weekend look like? User: A long trail hike on Saturday, a good book and cooking Sunday. Maybe a debate about something interesting. AI: What's most important to you in a partner? User: Conviction and kindness. I want someone who stands for something.",
    },

    # ── Guys (2) ───────────────────────────────────────────────────────────────
    {
        "email": "jake.morgan@neruo.dev",
        "password": "Neruo2024!",
        "first_name": "Jake",
        "last_name": "Morgan",
        "age": 26,
        "gender": "Male",
        "orientation": "Straight",
        "pronouns": "he/him",
        "bio": "Personal trainer and weekend surfer. I wake up at 5am voluntarily (I know). Big on self-improvement but also big on rest days and quality pasta. Looking for someone who balances hustle with chill.",
        "city": "Los Angeles",
        "state": "CA",
        "job_title": "Personal Trainer",
        "interests": ["Fitness", "Surfing", "Cooking", "Travel", "Music"],
        "looking_for": "Relationship",
        "photos": ["https://randomuser.me/api/portraits/men/32.jpg"],
        "conversation": "User: I'm a personal trainer and I surf on weekends. Early riser. AI: What are you like outside the gym? User: I love cooking, especially pasta from scratch. People are surprised by that. AI: What kind of person are you looking for? User: Someone driven but knows how to slow down. I like balance. AI: What do you value most? User: Consistency and authenticity. I can't do games. AI: What's your idea of a great date? User: Sunrise surf, then brunch I cook at home. Or exploring a new neighborhood.",
    },
    {
        "email": "marcus.davis@neruo.dev",
        "password": "Neruo2024!",
        "first_name": "Marcus",
        "last_name": "Davis",
        "age": 29,
        "gender": "Male",
        "orientation": "Straight",
        "pronouns": "he/him",
        "bio": "Architect who sketches buildings by day and skylines by night. I'm equal parts detail-oriented and spontaneous — I'll plan a perfect dinner but also book a flight on a Friday. Looking for someone curious about the world.",
        "city": "New York",
        "state": "NY",
        "job_title": "Architect",
        "interests": ["Architecture", "Travel", "Photography", "Art", "Coffee"],
        "looking_for": "Relationship",
        "photos": ["https://randomuser.me/api/portraits/men/75.jpg"],
        "conversation": "User: I'm an architect, love design, travel, and photography. AI: What inspires your work? User: Cities. The way people build and inhabit spaces tells you everything about a culture. AI: What are you like in a relationship? User: Attentive and thoughtful. I remember small details and I show up. AI: What do you do for fun? User: Urban sketching, photography walks, finding hole-in-the-wall coffee spots. AI: What kind of person are you looking for? User: Someone curious and open. I want to explore the world with someone, not just beside them.",
    },
]


def post(url, data, headers=None):
    if headers is None:
        headers = {}
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode(),
        headers={"Content-Type": "application/json", **headers},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.loads(r.read()), None
    except urllib.error.HTTPError as e:
        return None, e.read().decode()


def main():
    print(f"Seeding {len(USERS)} users into {BASE_URL}\n")

    # Check server is up
    try:
        with urllib.request.urlopen(f"{BASE_URL}/health", timeout=5) as r:
            pass
    except Exception:
        print("ERROR: Backend is not running. Start it with ./run.sh first.")
        sys.exit(1)

    for i, u in enumerate(USERS, 1):
        name = f"{u['first_name']} {u['last_name']}"
        print(f"[{i}/{len(USERS)}] Creating {name}...")

        # 1. Register
        data, err = post(f"{BASE_URL}/auth/register", {
            "email": u["email"],
            "password": u["password"],
            "display_name": u["first_name"],
        })
        if err:
            err_data = json.loads(err) if err.startswith("{") else {}
            if "already exists" in err or "EMAIL_EXISTS" in err:
                print(f"  ↳ Already exists, logging in...")
                data, err2 = post(f"{BASE_URL}/auth/login", {
                    "email": u["email"],
                    "password": u["password"],
                })
                if err2:
                    print(f"  ✗ Login failed: {err2[:80]}")
                    continue
            else:
                print(f"  ✗ Register failed: {err[:80]}")
                continue

        token = data["token"]
        uid = data["user"]["uid"]
        auth = {"Authorization": f"Bearer {token}"}
        print(f"  ✓ Auth OK (uid: {uid[:12]}...)")

        # 2. Save profile
        _, err = post(f"{BASE_URL}/profiles/me", {
            "first_name": u["first_name"],
            "last_name": u["last_name"],
            "age": u["age"],
            "gender": u["gender"],
            "orientation": u["orientation"],
            "pronouns": u["pronouns"],
            "bio": u["bio"],
            "city": u["city"],
            "state": u["state"],
            "job_title": u["job_title"],
            "interests": u["interests"],
            "looking_for": u["looking_for"],
            "photos": u["photos"],
        }, auth)
        if err:
            print(f"  ✗ Profile save failed: {err[:80]}")
            continue
        print(f"  ✓ Profile saved")

        # 3. Embed personality into Qdrant
        data2, err = post(f"{BASE_URL}/onboarding/summarize", {
            "conversation": u["conversation"],
        }, auth)
        if err:
            print(f"  ✗ Embed failed: {err[:80]}")
            continue
        print(f"  ✓ Embedded — vector_stored: {data2.get('vector_stored')}")
        print(f"  ✓ Summary: {data2.get('personality_summary', '')[:80]}...")
        print()

        time.sleep(0.5)  # gentle rate limiting

    print("Done! All users seeded.")


if __name__ == "__main__":
    main()
