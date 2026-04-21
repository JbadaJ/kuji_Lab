#!/usr/bin/env python3
"""
타이틀이 잘못 스크래핑된 상품(사이트 기본 타이틀로 저장된 것)을 찾아서 재스크래핑.

Usage:
  python scripts/fix_bad_titles.py
"""
import json, sys, re, asyncio
from datetime import datetime
from pathlib import Path

try:
    from playwright.async_api import async_playwright
    from bs4 import BeautifulSoup
except ImportError:
    print("필수 패키지 없음. 설치: pip install playwright beautifulsoup4 && python -m playwright install chromium")
    sys.exit(1)

DATA_DIR = Path(__file__).parent.parent / "data"
BASE_URL = "https://1kuji.com"

BAD_TITLES = {
    "一番くじ倶楽部｜BANDAI SPIRITS公式 一番くじ情報サイト",
    "이치 반 쿠지 클럽 | BANDAI SPIRITS 공식 이치 반 쿠지 정보 사이트",
    "Ichibankuji Club | BANDAI SPIRITS Official Ichibankuji Information Site",
}


def load_all() -> dict[str, tuple[dict, Path]]:
    """slug → (product, filepath) 딕셔너리 반환."""
    result = {}
    for filepath in sorted(DATA_DIR.glob("kuji_products_*.json")):
        products = json.load(open(filepath, encoding="utf-8"))
        for p in products:
            result[p["slug"]] = (p, filepath)
    return result


async def scrape_title(page, slug: str) -> str | None:
    """상품 페이지에서 타이틀만 추출. None이면 실패."""
    url = f"{BASE_URL}/products/{slug}"
    try:
        await page.goto(url, wait_until="domcontentloaded", timeout=30000)
        await page.wait_for_timeout(3000)  # JS 렌더링 대기
        html = await page.content()
        soup = BeautifulSoup(html, "html.parser")

        # h1 → og:title → <title> 순서로 시도
        h1 = soup.find("h1")
        if h1:
            title = h1.get_text(strip=True)
            if title and title not in BAD_TITLES:
                return title

        og = soup.find("meta", property="og:title")
        if og:
            title = og.get("content", "").strip()
            if title and title not in BAD_TITLES:
                return title

        tag = soup.find("title")
        if tag:
            raw = tag.get_text(strip=True)
            title = raw.split("|")[0].split("｜")[0].strip()
            if title and title not in BAD_TITLES:
                return title

        return None
    except Exception as e:
        print(f"  오류 ({slug}): {e}")
        return None


async def main():
    all_products = load_all()

    # bad title 상품 찾기
    bad = [(slug, p, fp) for slug, (p, fp) in all_products.items()
           if p.get("title") in BAD_TITLES]

    if not bad:
        print("수정이 필요한 상품이 없습니다.")
        return

    print(f"bad title 상품 {len(bad)}개 발견 — 재스크래핑 시작...\n")

    # filepath별로 묶어서 나중에 한번에 저장
    fixes: dict[Path, dict[str, str]] = {}  # filepath → {slug: new_title}

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        page = await browser.new_page()
        await page.set_extra_http_headers({"Accept-Language": "ja-JP,ja;q=0.9"})

        for i, (slug, product, filepath) in enumerate(bad):
            rd = product.get("release_date", "?")
            print(f"[{i+1}/{len(bad)}] {slug} ({rd})")
            new_title = await scrape_title(page, slug)
            if new_title:
                print(f"  → {new_title}")
                fixes.setdefault(filepath, {})[slug] = new_title
            else:
                print(f"  → 타이틀 감지 실패 (건너뜀)")
            await page.wait_for_timeout(800)

        await browser.close()

    if not fixes:
        print("\n수정된 상품 없음.")
        return

    # 파일별로 저장
    total_fixed = 0
    for filepath, slug_title_map in fixes.items():
        products = json.load(open(filepath, encoding="utf-8"))
        for p in products:
            if p["slug"] in slug_title_map:
                p["title"] = slug_title_map[p["slug"]]
                p["scraped_at"] = datetime.now().isoformat()
                total_fixed += 1
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(products, f, ensure_ascii=False, separators=(",", ":"))
        print(f"\n저장: {filepath.name} ({len(slug_title_map)}개 수정)")

    print(f"\n완료: 총 {total_fixed}개 상품 타이틀 수정됨")


if __name__ == "__main__":
    asyncio.run(main())
