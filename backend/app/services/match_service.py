from typing import Any, Dict, List, Optional

from app.adapters.qdrant_adapter import COLLECTION_NAME, QdrantAdapter
from app.utils import geo, ranking


def interest_overlap(a: List[str], b: List[str]) -> tuple[float, List[str]]:
    sa = set(x.lower() for x in a or [])
    sb = set(x.lower() for x in b or [])
    overlap = sorted(sa & sb)
    denom = max(1, len(sa | sb))
    return len(overlap) / denom, overlap


def prefs_compatible(a: Dict[str, Any], b: Dict[str, Any]) -> Dict[str, bool]:
    a_age = a.get("age") or 0
    b_age = b.get("age") or 0
    a_min = (a.get("prefs") or {}).get("age_min") or 18
    a_max = (a.get("prefs") or {}).get("age_max") or 99
    b_min = (b.get("prefs") or {}).get("age_min") or 18
    b_max = (b.get("prefs") or {}).get("age_max") or 99
    a_seek = (a.get("prefs") or {}).get("seek_gender") or []
    b_seek = (b.get("prefs") or {}).get("seek_gender") or []
    a_gender = a.get("gender", "")
    b_gender = b.get("gender", "")

    mutual_age_ok = (b_min <= a_age <= b_max) and (a_min <= b_age <= a_max)
    mutual_gender_ok = (not a_seek or b_gender in a_seek) and (
        not b_seek or a_gender in b_seek
    )
    return {"mutual_age_ok": mutual_age_ok, "mutual_gender_ok": mutual_gender_ok}


def discover_matches(
    qdrant: QdrantAdapter,
    seeker_uid: str,
    seeker_vector: List[float],
    seeker_profile: Dict[str, Any],
    blocked_uids: set[str],
    already_liked_uids: set[str],
    limit: int = 20,
    max_distance_km: float = 100.0,
) -> List[Dict[str, Any]]:
    raw = qdrant.query(
        collection=COLLECTION_NAME,
        vector=seeker_vector,
        limit=100,
        with_payload=True,
    )

    seeker_lat = (seeker_profile.get("location") or {}).get("lat")
    seeker_lon = (seeker_profile.get("location") or {}).get("lon")
    seeker_interests = seeker_profile.get("interests") or []

    scored = []
    for r in raw:
        cand_uid = r["payload"].get("uid", r["id"])
        if cand_uid == seeker_uid:
            continue
        if cand_uid in blocked_uids or cand_uid in already_liked_uids:
            continue

        cand_lat = r["payload"].get("lat")
        cand_lon = r["payload"].get("lon")
        dist = geo.haversine_km(seeker_lat, seeker_lon, cand_lat, cand_lon)

        # Only apply distance filter if both users have location data
        has_location = None not in (seeker_lat, seeker_lon, cand_lat, cand_lon)
        if has_location and max_distance_km and dist > max_distance_km:
            continue

        overlap_frac, overlap_tags = interest_overlap(
            seeker_interests, r["payload"].get("interests") or []
        )
        prefs = prefs_compatible(seeker_profile, r["payload"])

        score = ranking.compute_score(
            similarity=r["score"],
            interest_overlap=overlap_frac,
            distance_km=dist,
            max_distance_km=max_distance_km,
            prefs_ok=all(prefs.values()),
        )

        reasons = ranking.explanation(r["score"], overlap_tags, dist, prefs)

        scored.append(
            {
                "user_id": cand_uid,
                "score": round(score, 3),
                "knn_similarity": round(r["score"], 3),
                "distance_km": round(dist, 1),
                "overlap_tags": overlap_tags,
                "prefs": prefs,
                "reasons": reasons,
            }
        )

    scored.sort(key=lambda x: x["score"], reverse=True)
    return scored[:limit]


def generate_explanation(
    seeker_profile: Dict[str, Any],
    candidate_profile: Dict[str, Any],
    similarity: float,
) -> Dict[str, Any]:
    seeker_interests = seeker_profile.get("interests") or []
    cand_interests = candidate_profile.get("interests") or []
    overlap_frac, overlap_tags = interest_overlap(seeker_interests, cand_interests)

    seeker_lat = (seeker_profile.get("location") or {}).get("lat")
    seeker_lon = (seeker_profile.get("location") or {}).get("lon")
    cand_lat = (candidate_profile.get("location") or {}).get("lat")
    cand_lon = (candidate_profile.get("location") or {}).get("lon")
    dist = geo.haversine_km(seeker_lat, seeker_lon, cand_lat, cand_lon)

    prefs = prefs_compatible(seeker_profile, candidate_profile)
    reasons = ranking.explanation(similarity, overlap_tags, dist, prefs)

    return {
        "similarity": round(similarity, 3),
        "interest_overlap": round(overlap_frac, 3),
        "distance_km": round(dist, 1),
        "prefs": prefs,
        "reasons": reasons,
    }
