"""
Ticket pool initialization — mirrors the TypeScript buildPool() logic
in SimulatorModal.tsx exactly so estimates match between solo and room mode.
"""
from __future__ import annotations


def get_grade(prize: dict) -> str:
    """Return the grade string for a prize dict."""
    grade = prize.get("grade", "")
    if grade:
        return grade
    import re
    m = re.match(r"^([A-Z]賞|ラストワン賞)", prize.get("full_name", ""))
    return m.group(1) if m else ""


def build_pool(prizes: list[dict]) -> dict[str, int]:
    """
    Build a grade → ticket_count mapping from raw prize dicts.
    Returns only non-ラストワン賞 grades; ラストワン賞 is handled separately.
    """
    regular = [p for p in prizes if get_grade(p) != "ラストワン賞"]

    # Check if all prizes have real count data
    has_real_counts = bool(regular) and all(
        (p.get("count") or 0) > 0 for p in regular
    )

    pool: dict[str, int] = {}

    if has_real_counts:
        for p in regular:
            grade = get_grade(p)
            if grade:
                pool[grade] = pool.get(grade, 0) + (p.get("count") or 1)
    else:
        # Estimation: grade at index i (0-based) gets (i+1)*factor tickets
        total_weight = sum(i + 1 for i in range(len(regular)))
        factor = max(1, round(80 / total_weight)) if total_weight > 0 else 1
        for i, p in enumerate(regular):
            grade = get_grade(p)
            if grade:
                pool[grade] = pool.get(grade, 0) + (i + 1) * factor

    # ラストワン賞 always gets exactly 1 ticket
    last_one = next((p for p in prizes if get_grade(p) == "ラストワン賞"), None)
    if last_one:
        pool["ラストワン賞"] = 1

    return pool
