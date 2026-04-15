#!/usr/bin/env python3
"""
fetch_kujimap.py — kujimap.com에서 등급별 티켓 수를 가져와 kuji_all_products.json에 반영

Usage:
  python scripts/fetch_kujimap.py
  python scripts/fetch_kujimap.py --slug doubutsuno_mori6   # 특정 상품만
  python scripts/fetch_kujimap.py --month 202604            # 특정 월만
  python scripts/fetch_kujimap.py --refetch                 # 이미 등록된 상품도 재확인
"""

import json, re, asyncio, sys, argparse
from difflib import SequenceMatcher
from pathlib import Path

try:
    from playwright.async_api import async_playwright
    from bs4 import BeautifulSoup
except ImportError:
    print(json.dumps({
        "type": "error",
        "message": "필수 패키지가 없습니다.\n  pip install playwright beautifulsoup4\n  python -m playwright install chromium"
    }), flush=True)
    sys.exit(1)

DATA_FILE = Path(__file__).parent.parent / "data" / "kuji_all_products.json"
KUJIMAP_BASE = "https://kujimap.com"
GRADE_RE = re.compile(r'^([A-Z]賞|ラストワン賞)')


def log(msg_type: str, **kwargs):
    print(json.dumps({"type": msg_type, **kwargs}, ensure_ascii=False), flush=True)


def title_similarity(a: str, b: str) -> float:
    """일반적인 prefix/suffix 제거 후 유사도 비교"""
    def clean(s: str) -> str:
        s = re.sub(r'^一番くじ\s*', '', s.strip())
        s = re.sub(r'\s+', ' ', s)
        return s.lower()
    return SequenceMatcher(None, clean(a), clean(b)).ratio()


def release_yyyymm(product: dict) -> str | None:
    """release_date 또는 scraped_at에서 YYYYMM 추출"""
    for field in ("release_date", "release_date_raw"):
        val = product.get(field, "") or ""
        m = re.search(r'(\d{4})年(\d{2})月', val)
        if m:
            return m.group(1) + m.group(2)
    # fallback: scraped_at (발매 전 스크랩이면 부정확할 수 있음)
    scraped = product.get("scraped_at", "")
    m2 = re.match(r'(\d{4})-(\d{2})', scraped)
    if m2:
        return m2.group(1) + m2.group(2)
    return None


async def fetch_month_listing(page, yyyymm: str) -> list[dict]:
    """kujimap 월별 목록 → [{"url": ..., "title": ...}, ...]"""
    url = f"{KUJIMAP_BASE}/1bankuji/1bankuji_{yyyymm}"
    try:
        await page.goto(url, wait_until="domcontentloaded", timeout=25000)
        await page.wait_for_timeout(2000)
        html = await page.content()
        soup = BeautifulSoup(html, "html.parser")

        results = []
        seen_hrefs: set[str] = set()

        for a in soup.find_all("a", href=re.compile(r"/1bankuji/1bankuji_\d{6}/1bankuji_\w+")):
            href: str = a.get("href", "")
            if not href or href in seen_hrefs:
                continue
            seen_hrefs.add(href)

            # 제목: 링크 텍스트 또는 근처 요소에서 추출
            raw_title = a.get_text(separator=" ", strip=True)
            if not raw_title:
                continue

            full_url = KUJIMAP_BASE + href if href.startswith("/") else href
            results.append({"url": full_url, "title": raw_title})

        return results
    except Exception as e:
        log("warning", message=f"목록 페이지 오류 ({yyyymm}): {e}")
        return []


async def fetch_ticket_counts(page, url: str) -> tuple[dict[str, int], int | None]:
    """
    상품 페이지 → ({grade: count}, total_tickets)
    예: ({"A賞": 2, "B賞": 1, ...}, 66)
    """
    try:
        await page.goto(url, wait_until="domcontentloaded", timeout=25000)
        await page.wait_for_timeout(2000)
        html = await page.content()
        soup = BeautifulSoup(html, "html.parser")

        page_text = soup.get_text()

        # 총 티켓 수: "1セット（66本）" 형식
        total: int | None = None
        total_m = re.search(r'1セット[（(](\d+)本[）)]', page_text)
        if total_m:
            total = int(total_m.group(1))

        counts: dict[str, int] = {}

        # 방법 1: <tr> 행에서 등급 + 정수 컬럼 파싱
        for row in soup.find_all("tr"):
            cells = row.find_all(["td", "th"])
            if len(cells) < 2:
                continue
            grade_text = cells[0].get_text(strip=True)
            gm = GRADE_RE.match(grade_text)
            if not gm:
                continue
            grade = gm.group(1)
            # 두 번째 컬럼부터 순서대로 확인 — 순수 정수면 티켓 수
            for cell in cells[1:]:
                t = cell.get_text(strip=True)
                if re.fullmatch(r'\d+', t) and int(t) > 0:
                    counts[grade] = int(t)
                    break

        # 방법 2: 행 방식 실패 시, 텍스트 패턴으로 fallback
        # 예: "A賞 商品名 2 全1種" 형태
        if not counts:
            for line in page_text.splitlines():
                line = line.strip()
                gm = GRADE_RE.match(line)
                if not gm:
                    continue
                grade = gm.group(1)
                nums = re.findall(r'\b(\d+)\b', line)
                # 첫 번째 단독 숫자(全N種 제외)를 티켓 수로 간주
                for n in nums:
                    val = int(n)
                    # 全N種의 N은 보통 작은 수 (1~20), 티켓 수는 더 클 수 있음
                    # 但し 区別은 어려우므로 첫 번째 숫자 사용
                    if val > 0:
                        counts[grade] = val
                        break

        return counts, total

    except Exception as e:
        log("warning", message=f"티켓 수 스크랩 실패 ({url}): {e}")
        return {}, None


def apply_counts_to_product(product: dict, counts: dict[str, int], kujimap_url: str) -> bool:
    """Prize 목록에 count 필드 설정. 변경 있으면 True 반환."""
    changed = False
    for prize in product.get("prizes", []):
        grade = prize.get("grade") or ""
        if not grade:
            gm = GRADE_RE.match(prize.get("full_name", ""))
            grade = gm.group(1) if gm else ""
        if grade in counts and counts[grade] > 0:
            if prize.get("count") != counts[grade]:
                prize["count"] = counts[grade]
                changed = True

    if changed:
        product["kujimap_url"] = kujimap_url

    return changed


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--slug",    help="특정 상품 slug만 처리")
    parser.add_argument("--month",   help="특정 월만 처리 (YYYYMM)")
    parser.add_argument("--refetch", action="store_true", help="이미 count 있는 상품도 재확인")
    args = parser.parse_args()

    log("progress", message="데이터 로드 중...", percent=0)
    with open(DATA_FILE, encoding="utf-8") as f:
        products: list[dict] = json.load(f)

    # 처리 대상 필터링
    def is_target(p: dict) -> bool:
        if not p.get("title") or not p.get("prizes"):
            return False
        if args.slug and p["slug"] != args.slug:
            return False
        ym = release_yyyymm(p)
        if args.month and ym != args.month:
            return False
        if not args.refetch:
            # 이미 모든 등급에 count가 있으면 스킵
            regular = [pr for pr in p["prizes"] if GRADE_RE.match(pr.get("grade") or pr.get("full_name", ""))]
            if regular and all(pr.get("count") for pr in regular):
                return False
        return bool(ym)

    targets = [p for p in products if is_target(p)]
    log("progress", message=f"총 {len(products)}개 중 처리 대상 {len(targets)}개", percent=3)

    if not targets:
        log("done", message="처리할 상품이 없습니다.", updated=0, total=len(products))
        return

    # 월별 그룹화
    by_month: dict[str, list[dict]] = {}
    for p in targets:
        ym = release_yyyymm(p)
        if ym:
            by_month.setdefault(ym, []).append(p)

    months = sorted(by_month.keys())
    log("progress", message=f"{len(months)}개월 처리 예정: {', '.join(months)}", percent=5)

    updated_count = 0
    failed_count = 0

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
            locale="ja-JP",
        )
        page = await context.new_page()

        total_months = len(months)
        for mi, yyyymm in enumerate(months):
            base_pct = 5 + int(88 * mi / total_months)
            log("progress",
                message=f"[{mi+1}/{total_months}] {yyyymm[:4]}년 {int(yyyymm[4:])}월 kujimap 목록 조회...",
                percent=base_pct)

            kujimap_list = await fetch_month_listing(page, yyyymm)
            if not kujimap_list:
                log("warning", message=f"  kujimap {yyyymm} 목록 없음 (접근 불가 or 해당 월 데이터 없음)")
                failed_count += len(by_month[yyyymm])
                continue

            log("progress",
                message=f"  kujimap {yyyymm}: {len(kujimap_list)}개 상품 발견",
                percent=base_pct + 1)

            for product in by_month[yyyymm]:
                # 제목 유사도 매칭
                best_match: dict | None = None
                best_score = 0.0
                for kp in kujimap_list:
                    score = title_similarity(product["title"], kp["title"])
                    if score > best_score:
                        best_score = score
                        best_match = kp

                MATCH_THRESHOLD = 0.45
                if best_match is None or best_score < MATCH_THRESHOLD:
                    log("warning",
                        message=f"  매칭 실패 (최고 유사도 {best_score:.2f}): {product['slug']} — \"{product['title'][:40]}\"")
                    failed_count += 1
                    continue

                log("progress",
                    message=f"  매칭 ({best_score:.2f}) {product['slug']} ↔ \"{best_match['title'][:35]}\"",
                    percent=base_pct + 2)

                counts, total = await fetch_ticket_counts(page, best_match["url"])

                if not counts:
                    log("warning", message=f"  티켓 수 없음: {product['slug']}")
                    failed_count += 1
                    await page.wait_for_timeout(600)
                    continue

                total_str = f" (총 {total}장)" if total else ""
                log("progress",
                    message=f"  ✓ {product['slug']}{total_str}: {counts}",
                    percent=base_pct + 3)

                if apply_counts_to_product(product, counts, best_match["url"]):
                    updated_count += 1

                await page.wait_for_timeout(800)

        await browser.close()

    # JSON 저장
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(products, f, ensure_ascii=False, separators=(",", ":"))

    log("done",
        message=f"완료 — 업데이트 {updated_count}개, 실패/스킵 {failed_count}개 (총 {len(products)}개)",
        updated=updated_count,
        failed=failed_count,
        total=len(products))


if __name__ == "__main__":
    asyncio.run(main())
