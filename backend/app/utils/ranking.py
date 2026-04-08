from typing import Dict, List


def compute_score(
    similarity: float,
    interest_overlap: float,
    distance_km: float,
    max_distance_km: float,
    prefs_ok: bool,
) -> float:
    distance_component = (
        max(0.0, 1.0 - (distance_km / max_distance_km)) if max_distance_km > 0 else 0.0
    )
    prefs_component = 1.0 if prefs_ok else 0.0
    return (
        0.60 * similarity
        + 0.25 * interest_overlap
        + 0.10 * distance_component
        + 0.05 * prefs_component
    )


def explanation(
    similarity: float,
    interest_overlap_tags: List[str],
    distance_km: float,
    prefs: Dict[str, bool],
) -> List[str]:
    reasons = [f"High personality similarity ({similarity:.2f})."]
    if interest_overlap_tags:
        reasons.append(f"Shared interests: {', '.join(interest_overlap_tags[:3])}.")
    if distance_km is not None and distance_km < 9999:
        reasons.append(f"Nearby (~{distance_km:.0f} km).")
    if prefs.get("mutual_age_ok"):
        reasons.append("Within each other's age preferences.")
    if prefs.get("mutual_gender_ok"):
        reasons.append("Preference compatibility.")
    return reasons
