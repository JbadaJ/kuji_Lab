#!/usr/bin/env python3
"""
Incremental scraper for kuji_all_products.json
Scrapes new months from 1kuji.com and merges with existing data.

Usage:
  python scripts/update_kuji.py
"""

import json, sys, re, asyncio
from datetime import datetime, date
from pathlib import Path

# Windows 콘솔 인코딩 문제 방지
if sys.stdout.encoding and sys.stdout.encoding.lower() not in ("utf-8", "utf8"):
    sys.stdout.reconfigure(encoding="utf-8")  # type: ignore[attr-defined]

try:
    from playwright.async_api import async_playwright
    from bs4 import BeautifulSoup
except ImportError:
    print(json.dumps({
        "type": "error",
        "message": "필수 패키지가 없습니다.\n설치 명령어:\n  pip install playwright beautifulsoup4\n  python -m playwright install chromium"
    }), flush=True)
    sys.exit(1)

DATA_DIR = Path(__file__).parent.parent / "data"
BASE_URL = "https://1kuji.com"

BAD_TITLES = {
    "一番くじ倶楽部｜BANDAI SPIRITS公式 一番くじ情報サイト",
    "이치 반 쿠지 클럽 | BANDAI SPIRITS 공식 이치 반 쿠지 정보 사이트",
    "Ichibankuji Club | BANDAI SPIRITS Official Ichibankuji Information Site",
    # 출시 전 一番くじONLINE 플레이스홀더 페이지의 h1 — 실제 제목은 <title>에 있음
    "一番くじONLINE",
}


def is_bad_title(title: str) -> bool:
    return not title or title in BAD_TITLES


def load_all_products() -> list:
    """data/ 디렉토리의 kuji_products_*.json 파일을 모두 읽어 병합."""
    all_products = []
    for filepath in sorted(DATA_DIR.glob("kuji_products_*.json")):
        with open(filepath, "r", encoding="utf-8") as f:
            all_products.extend(json.load(f))
    return all_products


def save_by_year(products: list) -> None:
    """상품 목록을 release_date 연도별로 분리하여 저장."""
    by_year: dict = {}
    for p in products:
        y = "unknown"
        if p.get("release_date"):
            m = re.search(r"(\d{4})年", p["release_date"])
            if m:
                y = m.group(1)
        by_year.setdefault(y, []).append(p)

    for year, year_products in by_year.items():
        filepath = DATA_DIR / f"kuji_products_{year}.json"
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(year_products, f, ensure_ascii=False, separators=(",", ":"))


def log(msg_type: str, **kwargs):
    print(json.dumps({"type": msg_type, **kwargs}, ensure_ascii=False), flush=True)


def get_months_to_scrape() -> list[tuple[int, int]]:
    """전월부터 현재 월+1까지 스크랩할 (year, month) 목록 반환."""
    today = date.today()

    # 전월부터 시작
    start_year, start_month = today.year, today.month - 1
    if start_month < 1:
        start_year -= 1
        start_month = 12

    # 현재 월 +1까지 (예정 상품 포함)
    end_year, end_month = today.year, today.month + 1
    if end_month > 12:
        end_year += 1
        end_month = 1

    months = []
    y, m = start_year, start_month
    while (y, m) <= (end_year, end_month):
        months.append((y, m))
        m += 1
        if m > 12:
            y += 1
            m = 1

    return months


async def scrape_product_list(page, year: int, month: int) -> list[str]:
    """상품 목록 페이지에서 slug 목록 반환."""
    url = f"{BASE_URL}/products?sale_month={month}&sale_year={year}"
    try:
        await page.goto(url, wait_until="domcontentloaded", timeout=30000)
        await page.wait_for_timeout(2000)
        html = await page.content()
        soup = BeautifulSoup(html, "html.parser")

        slugs = []
        seen = set()
        for a in soup.find_all("a", href=re.compile(r"^/products/[^?#\s/]+")):
            href = a.get("href", "")
            slug = href.split("/products/")[-1].strip("/")
            if slug and slug not in seen and not slug.startswith("?"):
                slugs.append(slug)
                seen.add(slug)
        return slugs
    except Exception as e:
        log("warning", message=f"목록 페이지 오류 ({year}/{month}): {e}")
        return []


async def scrape_product_detail(page, slug: str, fallback_title: str = "") -> dict | None:
    """상품 상세 페이지 스크랩.
    fallback_title: 기존 상품의 경우 제목을 못 찾아도 이 값으로 대체.
    """
    url = f"{BASE_URL}/products/{slug}"
    try:
        await page.goto(url, wait_until="domcontentloaded", timeout=30000)
        await page.wait_for_timeout(2000)

        # 一番くじONLINE 전용 상품은 JS가 on-line.1kuji.com으로 리다이렉트해 버려서
        # 렌더링된 DOM에는 서비스 홈("一番くじONLINE")만 남는다. 이 경우 JS를 실행하지
        # 않는 정적 HTML을 다시 받아 파싱한다 — 실제 제목/배너가 거기에 있다.
        if f"/products/{slug}" not in page.url:
            log("progress", message=f"  ↪ 리다이렉트 감지({page.url[:40]}...) — 정적 HTML로 파싱: {slug}")
            resp = await page.context.request.get(url, timeout=30000)
            html = await resp.text()
        else:
            html = await page.content()
        soup = BeautifulSoup(html, "html.parser")

        product: dict = {
            "url": url,
            "slug": slug,
            "scraped_at": datetime.now().isoformat(),
            "title": "",
            "sale_type": [],
            "gallery_images": [],
            "prizes": [],
            "prize_count": 0,
        }

        # 타이틀 추출 함수
        def extract_title(s: BeautifulSoup) -> str:
            # h1 → og:title → <title> 순으로 시도
            h1 = s.find("h1")
            if h1:
                t = h1.get_text(strip=True)
                if not is_bad_title(t):
                    return t

            og = s.find("meta", property="og:title")
            if og:
                t = og.get("content", "").strip()
                if not is_bad_title(t):
                    return t

            title_tag = s.find("title")
            if title_tag:
                raw = title_tag.get_text(strip=True)
                t = raw.split("|")[0].split("｜")[0].strip()
                if not is_bad_title(t):
                    return t
            return ""

        product["title"] = extract_title(soup)

        # BAD_TITLE인 경우 JS 렌더링 대기 후 재시도
        if not product["title"]:
            await page.wait_for_timeout(5000)
            html = await page.content()
            soup = BeautifulSoup(html, "html.parser")
            product["title"] = extract_title(soup)

        if not product["title"] and fallback_title and not is_bad_title(fallback_title):
            product["title"] = fallback_title
            log("warning", message=f"  제목 미감지, 기존 제목 유지: {slug}")

        page_text = soup.get_text()

        # 배너 이미지
        for img in soup.find_all("img"):
            src = img.get("src", "")
            if "assets.1kuji.com" in src:
                product["banner_image_url"] = src
                break

        # 갤러리 이미지
        seen_imgs = {product.get("banner_image_url")}
        for img in soup.find_all("img"):
            src = img.get("src", "")
            if "assets.1kuji.com" in src and src not in seen_imgs:
                product["gallery_images"].append(src)
                seen_imgs.add(src)

        # 판매 유형
        if "店頭" in page_text:
            product["sale_type"].append("店頭販売")
        if "オンライン" in page_text:
            product["sale_type"].append("オンライン販売")

        # 발매일
        m = re.search(r'\d{4}年\d{2}月\d{2}日', page_text)
        if m:
            product["release_date"] = m.group()
            product["release_date_raw"] = m.group()

        # 가격
        m = re.search(r'(\d{3,4})円', page_text)
        if m:
            product["price_yen"] = int(m.group(1))
            product["price_raw"] = m.group()

        # 취급점
        store_el = soup.find(string=re.compile(r'(ファミリーマート|ローソン|セブン|コンビニ|玩具店|Nintendo)', re.IGNORECASE))
        if store_el and store_el.parent:
            txt = store_el.parent.get_text(strip=True)
            if len(txt) < 300:
                product["stores"] = txt

        # 경품 목록
        prizes = []
        grade_re = re.compile(r'^([A-Z]賞|ラストワン賞)')

        for el in soup.find_all(["li", "tr", "div"]):
            txt = el.get_text(strip=True)
            gm = grade_re.match(txt)
            if not gm:
                continue
            # 너무 긴 컨테이너는 건너뜀 (전체 섹션 등)
            if len(txt) > 300:
                continue

            grade = gm.group(1)
            name_raw = txt[len(grade):].strip().lstrip("：: ")
            full_name = f"{grade} {name_raw}"[:120]

            images = []
            for img in el.find_all("img"):
                src = img.get("src", "")
                if "assets.1kuji.com" in src:
                    images.append(src)

            variants = None
            vm = re.search(r'全(\d+)種', txt)
            if vm:
                variants = int(vm.group(1))

            size = None
            sm = re.search(r'約[\d.]+[cmCM㎝]+', txt)
            if sm:
                size = sm.group()

            prize: dict = {
                "full_name": full_name,
                "grade": grade,
                "name": name_raw[:100],
                "images": images,
            }
            if variants:
                prize["variants"] = variants
            if size:
                prize["size"] = size

            prizes.append(prize)

        if prizes:
            # 중복 grade 제거 (가장 이미지 많은 것 유지)
            seen_grades: set = set()
            deduped = []
            for pr in prizes:
                if pr["grade"] not in seen_grades:
                    deduped.append(pr)
                    seen_grades.add(pr["grade"])
            product["prizes"] = deduped
            product["prize_count"] = len(deduped)

        if is_bad_title(product["title"]):
            return None
        return product if product["title"] else None

    except Exception as e:
        log("warning", message=f"상세 페이지 오류 ({slug}): {str(e)[:100]}")
        return None


async def main():
    log("progress", message="기존 데이터 로드 중...", percent=0)

    if not any(DATA_DIR.glob("kuji_products_*.json")):
        log("error", message=f"데이터 파일 없음: {DATA_DIR}/kuji_products_*.json")
        sys.exit(1)

    existing: list = load_all_products()

    existing_by_slug: dict = {p["slug"]: p for p in existing}

    # 재확인 대상: prize_count == 0 또는 BAD_TITLE인 상품
    recheck_slugs: list = [
        p["slug"] for p in existing
        if (p.get("prize_count", 0) == 0 and p.get("title"))
        or is_bad_title(p.get("title", ""))
    ]
    log("progress",
        message=f"기존 상품 {len(existing)}개 로드 완료 (재확인 대상 {len(recheck_slugs)}개: 경품 미등록 또는 제목 오류)",
        percent=5)

    months = get_months_to_scrape()
    months_str = ", ".join(f"{y}년 {m}월" for y, m in months)
    log("progress", message=f"월별 스크랩 대상: {months_str}", percent=8)

    updated_count = 0
    new_count_total = 0
    scraped_slugs: set = set()   # 이번 실행에서 이미 처리한 slug (중복 방지)
    save_pending = 0             # 저장 대기 중인 변경 수

    SAVE_INTERVAL = 20  # N개 스크랩마다 중간 저장

    def do_save():
        """현재 existing 상태를 연도별 파일로 저장."""
        save_by_year(list(existing_by_slug.values()))

    def apply_product(product: dict, is_new: bool):
        """스크랩 결과를 existing_by_slug에 즉시 반영."""
        nonlocal updated_count, new_count_total, save_pending
        existing_by_slug[product["slug"]] = product
        if is_new:
            new_count_total += 1
        else:
            updated_count += 1
        save_pending += 1
        if save_pending >= SAVE_INTERVAL:
            do_save()
            log("progress", message=f"  💾 중간 저장 완료 (신규 {new_count_total}, 업데이트 {updated_count})")
            save_pending = 0

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        page = await browser.new_page()
        await page.set_extra_http_headers({"Accept-Language": "ja-JP,ja;q=0.9"})

        total = len(months)
        for i, (year, month) in enumerate(months):
            base_pct = 10 + int(70 * i / total)
            log("progress", message=f"[{i+1}/{total}] {year}년 {month}월 목록 확인 중...", percent=base_pct)

            slugs = await scrape_product_list(page, year, month)
            slugs_to_scrape = [s for s in slugs if s not in scraped_slugs]

            existing_cnt = sum(1 for s in slugs_to_scrape if s in existing_by_slug)
            new_cnt = len(slugs_to_scrape) - existing_cnt
            log("progress",
                message=f"  → {len(slugs)}개 발견 (신규 {new_cnt}개, 업데이트 확인 {existing_cnt}개)",
                percent=base_pct + 3)

            for j, slug in enumerate(slugs_to_scrape):
                scraped_slugs.add(slug)
                is_existing = slug in existing_by_slug
                label = "(업데이트 확인)" if is_existing else "(신규)"
                pct = base_pct + 3 + int(60 * (j + 1) / max(len(slugs_to_scrape), 1) * (1 / total))
                log("progress", message=f"  스크랩: {slug} {label}", percent=min(pct, base_pct + 30))

                fallback = existing_by_slug[slug].get("title", "") if is_existing else ""
                product = await scrape_product_detail(page, slug, fallback_title=fallback)
                if product:
                    apply_product(product, is_new=not is_existing)

                await page.wait_for_timeout(600)

        # ── 재확인 대상 (prize_count==0 또는 BAD_TITLE) ──────────
        remaining_recheck = [s for s in recheck_slugs if s not in scraped_slugs]
        if remaining_recheck:
            log("progress",
                message=f"재확인 대상 {len(remaining_recheck)}개 추가 스크랩 중...",
                percent=82)
            for j, slug in enumerate(remaining_recheck):
                scraped_slugs.add(slug)
                pct = 82 + int(13 * (j + 1) / len(remaining_recheck))
                log("progress", message=f"  재확인: {slug}", percent=pct)

                fallback = existing_by_slug[slug].get("title", "")
                product = await scrape_product_detail(page, slug, fallback_title=fallback)
                if product:
                    apply_product(product, is_new=False)

                await page.wait_for_timeout(600)

        await browser.close()

    total_products = len(existing_by_slug)
    if updated_count or new_count_total:
        do_save()
        log("done",
            message=f"✓ 신규 {new_count_total}개 추가, 기존 {updated_count}개 업데이트 (총 {total_products}개)",
            added=new_count_total,
            updated=updated_count,
            total=total_products)
    else:
        log("done", message="변경사항이 없습니다.", added=0, updated=0, total=total_products)


if __name__ == "__main__":
    asyncio.run(main())
