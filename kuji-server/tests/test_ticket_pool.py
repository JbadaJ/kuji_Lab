"""Tests for services.ticket_pool — must stay behaviorally identical to
the TypeScript buildPool() in kuji-lab/app/products/[slug]/simulator/core.ts."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from services.ticket_pool import get_grade, build_pool, build_prize_info


def prize(grade, count=None, full_name=None, name="テスト賞品", images=None):
    p = {
        "grade": grade,
        "full_name": full_name if full_name is not None else f"{grade} {name}",
        "name": name,
        "images": images or [],
    }
    if count is not None:
        p["count"] = count
    return p


class TestGetGrade:
    def test_returns_grade_field(self):
        assert get_grade(prize("A賞")) == "A賞"

    def test_falls_back_to_full_name(self):
        assert get_grade({"grade": "", "full_name": "B賞 タオル"}) == "B賞"
        assert get_grade({"grade": "", "full_name": "ラストワン賞 特別品"}) == "ラストワン賞"

    def test_empty_when_unparseable(self):
        assert get_grade({"grade": "", "full_name": "ダブルチャンス"}) == ""


class TestBuildPool:
    def test_real_counts(self):
        pool = build_pool([prize("A賞", 2), prize("B賞", 10)])
        assert pool == {"A賞": 2, "B賞": 10}

    def test_last_one_always_single_ticket(self):
        pool = build_pool([prize("A賞", 2), prize("ラストワン賞", 5)])
        assert pool["ラストワン賞"] == 1
        assert pool["A賞"] == 2

    def test_estimation_when_count_missing(self):
        # totalWeight = 1+2 = 3, factor = round(80/3) = 27
        pool = build_pool([prize("A賞", 2), prize("B賞")])
        assert pool == {"A賞": 27, "B賞": 54}

    def test_estimated_total_near_80(self):
        prizes = [prize(g) for g in ["A賞", "B賞", "C賞", "D賞", "E賞"]]
        pool = build_pool(prizes)
        assert 60 <= sum(pool.values()) <= 100

    def test_rarer_grades_get_fewer_tickets(self):
        pool = build_pool([prize("A賞"), prize("B賞"), prize("C賞")])
        assert pool["A賞"] < pool["B賞"] < pool["C賞"]

    def test_same_grade_counts_accumulate(self):
        pool = build_pool([prize("A賞", 2), prize("A賞", 3)])
        assert pool == {"A賞": 5}

    def test_empty_prizes(self):
        assert build_pool([]) == {}


class TestBuildPrizeInfo:
    def test_first_prize_per_grade_wins(self):
        prizes = [
            prize("A賞", name="フィギュア", images=["a1.jpg"]),
            prize("A賞", name="別フィギュア", images=["a2.jpg"]),
            prize("B賞", name="タオル"),
        ]
        info = build_prize_info(prizes)
        assert info["A賞"] == {"name": "フィギュア", "image": "a1.jpg"}
        assert info["B賞"]["image"] is None

    def test_skips_gradeless_prizes(self):
        info = build_prize_info([{"grade": "", "full_name": "ダブルチャンス", "images": []}])
        assert info == {}
