"""
seed_more_users.py — Add 10 more bot users to Neruo.
Run from the backend directory:  python scripts/seed_more_users.py
"""

import time, urllib.request, json, sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

BASE_URL = "http://localhost:8000"

USERS = [
    {
        "email": "chloe.kim@neruo.dev",
        "password": "Neruo2024!",
        "first_name": "Chloe",
        "last_name": "Kim",
        "age": 23,
        "gender": "Female",
        "orientation": "Straight",
        "pronouns": "she/her",
        "bio": "Film student obsessed with indie cinema and long walks through the city at night. I write short stories on my phone at coffee shops. Looking for someone who finds beauty in small things.",
        "city": "Los Angeles",
        "state": "CA",
        "job_title": "Film Student",
        "interests": ["Film", "Writing", "Coffee", "Art", "Music"],
        "looking_for": "Relationship",
        "photos": ["https://i.pravatar.cc/500?img=10"],
        "conversation": "User: I study film, I love indie movies and writing short stories. AI: What draws you to indie cinema? User: The rawness of it. No CGI, just real human emotion. AI: What kind of person are you looking for? User: Someone thoughtful and curious. I want deep conversations, not small talk. AI: What's your ideal date? User: A late night film screening followed by walking the city and talking about everything.",
    },
    {
        "email": "isabelle.martin@neruo.dev",
        "password": "Neruo2024!",
        "first_name": "Isabelle",
        "last_name": "Martin",
        "age": 26,
        "gender": "Female",
        "orientation": "Straight",
        "pronouns": "she/her",
        "bio": "French pastry chef who moved to New York chasing a dream. My apartment always smells like butter and vanilla. I believe the best conversations happen over food.",
        "city": "New York",
        "state": "NY",
        "job_title": "Pastry Chef",
        "interests": ["Cooking", "Travel", "Art", "Wine", "Music"],
        "looking_for": "Relationship",
        "photos": ["https://i.pravatar.cc/500?img=15"],
        "conversation": "User: I'm a pastry chef, moved from France to New York. Love cooking and food. AI: What brought you to New York? User: I wanted to push myself. Paris felt too comfortable. AI: What kind of person clicks with you? User: Someone who appreciates the effort behind things. Food, art, a good outfit — details matter. AI: What do you do when you're not baking? User: I explore neighborhoods I've never been to. Every block in this city has a story.",
    },
    {
        "email": "nadia.hassan@neruo.dev",
        "password": "Neruo2024!",
        "first_name": "Nadia",
        "last_name": "Hassan",
        "age": 25,
        "gender": "Female",
        "orientation": "Straight",
        "pronouns": "she/her",
        "bio": "Pediatric nurse with a heart too big for my own good. Volunteer at animal shelters on weekends. I'm loud about things I care about and quiet about everything else.",
        "city": "Chicago",
        "state": "IL",
        "job_title": "Pediatric Nurse",
        "interests": ["Healthcare", "Animals", "Fitness", "Travel", "Cooking"],
        "looking_for": "Relationship",
        "photos": ["https://i.pravatar.cc/500?img=20"],
        "conversation": "User: I'm a pediatric nurse and I volunteer at animal shelters. AI: What made you want to work with kids? User: I love the honesty of children. They don't pretend. AI: What do you value in a partner? User: Empathy and consistency. I'm giving a lot at work — I need someone who shows up. AI: How do you recharge? User: Long runs, cooking something comforting, and my dog Biscuit.",
    },
    {
        "email": "priya.sharma@neruo.dev",
        "password": "Neruo2024!",
        "first_name": "Priya",
        "last_name": "Sharma",
        "age": 27,
        "gender": "Female",
        "orientation": "Straight",
        "pronouns": "she/her",
        "bio": "Data scientist by day, amateur astronomer by night. I think the universe is too big to take yourself too seriously. Obsessed with board games, spicy food, and finding the best chai in the city.",
        "city": "Seattle",
        "state": "WA",
        "job_title": "Data Scientist",
        "interests": ["Science", "Board Games", "Food", "Astronomy", "Hiking"],
        "looking_for": "Relationship",
        "photos": ["https://i.pravatar.cc/500?img=25"],
        "conversation": "User: I'm a data scientist and I love stargazing in my free time. AI: What got you into astronomy? User: Looking at the night sky makes everything feel smaller and more manageable. AI: What kind of person are you hoping to meet? User: Someone nerdy and silly. I want to debate the Fermi paradox and also laugh until we cry. AI: What's your love language? User: Acts of service and quality time. I'm not big on gifts.",
    },
    {
        "email": "grace.okafor@neruo.dev",
        "password": "Neruo2024!",
        "first_name": "Grace",
        "last_name": "Okafor",
        "age": 24,
        "gender": "Female",
        "orientation": "Straight",
        "pronouns": "she/her",
        "bio": "Graphic designer and sneaker collector. My apartment is half studio, half gallery. I believe design is problem-solving with style. Always down for a rooftop, a vinyl set, and good company.",
        "city": "Atlanta",
        "state": "GA",
        "job_title": "Graphic Designer",
        "interests": ["Design", "Art", "Music", "Fashion", "Travel"],
        "looking_for": "Something casual",
        "photos": ["https://i.pravatar.cc/500?img=30"],
        "conversation": "User: I'm a graphic designer and I collect sneakers. Big into music and art. AI: What does your creative process look like? User: Chaos first, then clarity. I sketch everywhere — napkins, phone notes, whatever. AI: What are you looking for right now? User: Honestly just fun and connection. I'm not rushing into anything serious. AI: What's your scene? User: Rooftops, record stores, and late-night diners.",
    },
    {
        "email": "luna.vasquez@neruo.dev",
        "password": "Neruo2024!",
        "first_name": "Luna",
        "last_name": "Vasquez",
        "age": 22,
        "gender": "Female",
        "orientation": "Bisexual",
        "pronouns": "she/her",
        "bio": "Environmental law student who wants to save the planet one lawsuit at a time. I hike, climb, and can start a fire without matches. Looking for someone who votes and composts.",
        "city": "Denver",
        "state": "CO",
        "job_title": "Law Student",
        "interests": ["Environment", "Hiking", "Climbing", "Reading", "Activism"],
        "looking_for": "Relationship",
        "photos": ["https://i.pravatar.cc/500?img=35"],
        "conversation": "User: I study environmental law and I love being outdoors. AI: What inspired you to pursue environmental law? User: Watching glaciers disappear on a school trip when I was 16. I got angry in a productive way. AI: What do you need in a partner? User: Someone who gives a damn about the world. Values aren't negotiable for me. AI: What do you do on weekends? User: Climbing, trail runs, or organizing community cleanups. I'm also weirdly good at campfire cooking.",
    },
    {
        "email": "ryan.brooks@neruo.dev",
        "password": "Neruo2024!",
        "first_name": "Ryan",
        "last_name": "Brooks",
        "age": 27,
        "gender": "Male",
        "orientation": "Straight",
        "pronouns": "he/him",
        "bio": "Music producer and part-time DJ. I've worked with artists you might know but I stay low-key about it. My studio is my sanctuary. Looking for someone who has their own thing going on.",
        "city": "Los Angeles",
        "state": "CA",
        "job_title": "Music Producer",
        "interests": ["Music", "Travel", "Food", "Art", "Fitness"],
        "looking_for": "Relationship",
        "photos": ["https://i.pravatar.cc/500?img=53"],
        "conversation": "User: I produce music and DJ on weekends. Music is my whole life. AI: What kind of music do you make? User: R&B and soul mostly, but I experiment a lot. I hate boxes. AI: What kind of person do you vibe with? User: Someone independent who has passion for their own craft. I don't want to be someone's whole world. AI: What does a perfect day look like? User: Studio until noon, gym, great meal, maybe a show at night. Low-key but full.",
    },
    {
        "email": "daniel.park@neruo.dev",
        "password": "Neruo2024!",
        "first_name": "Daniel",
        "last_name": "Park",
        "age": 28,
        "gender": "Male",
        "orientation": "Straight",
        "pronouns": "he/him",
        "bio": "ER doctor who somehow still believes in the goodness of people. I run marathons to process the week. My friends say I'm too calm in chaos — I prefer 'reliable'. Looking for real over perfect.",
        "city": "Boston",
        "state": "MA",
        "job_title": "ER Doctor",
        "interests": ["Medicine", "Running", "Cooking", "Travel", "Reading"],
        "looking_for": "Relationship",
        "photos": ["https://i.pravatar.cc/500?img=60"],
        "conversation": "User: I'm an ER doctor, I run marathons to decompress. AI: How do you manage such a high-pressure job? User: Running helps. So does cooking — it's meditative. AI: What kind of relationship are you looking for? User: Something genuine. I see enough pretense at work. I want honesty and warmth at home. AI: What's something people get wrong about you? User: That I'm always serious. I'm actually pretty goofy once you get to know me.",
    },
    {
        "email": "alex.chen@neruo.dev",
        "password": "Neruo2024!",
        "first_name": "Alex",
        "last_name": "Chen",
        "age": 25,
        "gender": "Male",
        "orientation": "Straight",
        "pronouns": "he/him",
        "bio": "Startup founder building tools for independent creators. I live on coffee, whiteboards, and optimism. When I'm not working I'm bouldering, reading sci-fi, or badly playing guitar.",
        "city": "San Francisco",
        "state": "CA",
        "job_title": "Startup Founder",
        "interests": ["Technology", "Climbing", "Reading", "Music", "Travel"],
        "looking_for": "Something casual",
        "photos": ["https://i.pravatar.cc/500?img=65"],
        "conversation": "User: I run a startup and I love bouldering and reading sci-fi. AI: What's your startup about? User: Tools for creators to monetize without selling out. I care about creative independence. AI: What are you looking for? User: Honestly something casual for now. Building a company is consuming. AI: What do you do to unplug? User: Climbing totally empties my mind. Or getting lost in a good book.",
    },
    {
        "email": "taylor.scott@neruo.dev",
        "password": "Neruo2024!",
        "first_name": "Taylor",
        "last_name": "Scott",
        "age": 24,
        "gender": "Female",
        "orientation": "Straight",
        "pronouns": "she/her",
        "bio": "Physical therapist and former collegiate soccer player. I still play in a rec league every Sunday. I'm competitive on the field and easy-going everywhere else. Big believer in saying yes to new things.",
        "city": "Austin",
        "state": "TX",
        "job_title": "Physical Therapist",
        "interests": ["Soccer", "Fitness", "Travel", "Cooking", "Music"],
        "looking_for": "Relationship",
        "photos": ["https://i.pravatar.cc/500?img=40"],
        "conversation": "User: I'm a physical therapist and I play soccer on weekends. Very active. AI: What do you love most about being a PT? User: Helping people get back to the things they love. It's incredibly rewarding. AI: What kind of guy are you attracted to? User: Someone who's active but also knows how to slow down. Driven but not obsessed with status. AI: What's your idea of a perfect weekend? User: Soccer game Sunday morning, brunch with friends, spontaneous adventure in the afternoon.",
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
    print(f"Seeding {len(USERS)} more users into {BASE_URL}\n")

    try:
        with urllib.request.urlopen(f"{BASE_URL}/health", timeout=5):
            pass
    except Exception:
        print("ERROR: Backend is not running. Start it first.")
        sys.exit(1)

    for i, u in enumerate(USERS, 1):
        name = f"{u['first_name']} {u['last_name']}"
        print(f"[{i}/{len(USERS)}] Creating {name}...")

        data, err = post(f"{BASE_URL}/auth/register", {
            "email": u["email"],
            "password": u["password"],
            "display_name": u["first_name"],
        })
        if err:
            if "already exists" in err or "EMAIL_EXISTS" in err:
                print(f"  ↳ Already exists, logging in...")
                data, err2 = post(f"{BASE_URL}/auth/login", {"email": u["email"], "password": u["password"]})
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

        data2, err = post(f"{BASE_URL}/onboarding/summarize", {"conversation": u["conversation"]}, auth)
        if err:
            print(f"  ✗ Embed failed: {err[:80]}")
            continue
        print(f"  ✓ Embedded — summary: {data2.get('personality_summary', '')[:60]}...")
        print()

        time.sleep(0.5)

    print("Done! Run mark_new_bots.py next to mark these as bots.")


if __name__ == "__main__":
    main()
