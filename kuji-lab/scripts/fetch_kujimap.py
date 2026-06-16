#!/usr/bin/env python3
"""
fetch_kujimap.py - kujimap.com에서 등급별 티켓 수를 가져와 kuji_all_products.json에 반영

Usage:
  python scripts/fetch_kujimap.py
  python scripts/fetch_kujimap.py --slug doubutsuno_mori6   # 특정 상품만
  python scripts/fetch_kujimap.py --month 202604            # 특정 월만
  python scripts/fetch_kujimap.py --refetch                 # 이미 등록된 상품도 재확인
  python scripts/fetch_kujimap.py --search-only             # 검색 기반 매칭만 사용 (월별 목록 스킵)
"""

import json, re, asyncio, sys, argparse
from difflib import SequenceMatcher
from pathlib import Path

# Windows 콘솔 인코딩 문제 방지
if sys.stdout.encoding and sys.stdout.encoding.lower() not in ("utf-8", "utf8"):
    sys.stdout.reconfigure(encoding="utf-8")  # type: ignore[attr-defined]

DATA_DIR = Path(__file__).parent.parent / "data"
GRADE_RE = re.compile(r'^([A-Z]賞|ラストワン賞)')

try:
    from playwright.async_api import async_playwright
    from bs4 import BeautifulSoup
except ImportError:
    print(json.dumps({
        "type": "error",
        "message": "필수 패키지가 없습니다.\n  pip install playwright beautifulsoup4\n  python -m playwright install chromium"
    }), flush=True)
    sys.exit(1)

KUJIMAP_BASE = "https://kujimap.com"


def log(msg_type: str, **kwargs):
    print(json.dumps({"type": msg_type, **kwargs}, ensure_ascii=False), flush=True)


def load_all_products() -> list[dict]:
    """data/ 디렉토리의 kuji_products_*.json 파일을 모두 읽어 병합."""
    all_products = []
    for filepath in sorted(DATA_DIR.glob("kuji_products_*.json")):
        with open(filepath, encoding="utf-8") as f:
            all_products.extend(json.load(f))
    return all_products


def save_by_year(products: list[dict]) -> None:
    """상품 목록을 release_date 연도별로 분리하여 저장."""
    by_year: dict[str, list] = {}
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


def clean_title(s: str) -> str:
    """제목에서 공통 prefix/장식 제거"""
    s = re.sub(r'^(一番くじ\s*(プレミアム|ONLINE|ONLINEプレミアム|Vプレミアム|MINI)?\s*)', '', s.strip())
    # 전각→반각 변환
    s = s.translate(str.maketrans('ＡＢＣＤＥＦＧＨＩＪＫＬＭＮＯＰＱＲＳＴＵＶＷＸＹＺａｂｃｄｅｆｇｈｉｊｋｌｍｎｏｐｑｒｓｔｕｖｗｘｙｚ０１２３４５６７８９',
                                  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'))
    s = re.sub(r'\s+', ' ', s)
    return s.lower()


def title_similarity(a: str, b: str) -> float:
    """일반적인 prefix/suffix 제거 후 유사도 비교"""
    return SequenceMatcher(None, clean_title(a), clean_title(b)).ratio()


def extract_search_keyword(title: str) -> str:
    """제목에서 kujimap 검색에 사용할 키워드 추출.

    '一番くじ ドラゴンボールZ～サイヤ人襲来編～' → 'ドラゴンボールZ'
    '一番くじ リラックマ～ハートデザイン～' → 'リラックマ'
    """
    cleaned = re.sub(r'^(一番くじ\s*(プレミアム|ONLINE|ONLINEプレミアム|Vプレミアム|MINI|ﾁｬﾚﾝｼﾞ)?\s*)', '', title.strip())
    # シャア専用一番くじ のような特殊 prefix
    cleaned = re.sub(r'^シャア専用一番くじ\s*', '', cleaned)

    # ～...～ や （...） を除去して作品名だけ残す
    keyword = re.split(r'[～〜~（(「【\-―─ ]', cleaned)[0].strip()

    # 全角→半角
    keyword = keyword.translate(str.maketrans('ＡＢＣＤＥＦＧＨＩＪＫＬＭＮＯＰＱＲＳＴＵＶＷＸＹＺａｂｃｄｅｆｇｈｉｊｋｌｍｎｏｐｑｒｓｔｕｖｗｘｙｚ０１２３４５６７８９',
                                              'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'))

    # 末尾の数字やバージョンを除去 (例: "リラックマ5th" → "リラックマ")
    keyword = re.sub(r'[\d]+(?:th|st|nd|rd)?$', '', keyword, flags=re.IGNORECASE).strip()

    # 短すぎたら元のcleaned全体を使う
    if len(keyword) < 2:
        keyword = cleaned[:20]

    return keyword


async def search_kujimap(page, keyword: str) -> list[dict]:
    """kujimap.com のWordPress検索で商品リストを取得.

    Returns: [{"url": ..., "title": ...}, ...]
    """
    from urllib.parse import quote
    url = f"{KUJIMAP_BASE}/?s={quote(keyword)}"
    try:
        await page.goto(url, wait_until="domcontentloaded", timeout=25000)
        await page.wait_for_timeout(2000)
        html = await page.content()
        soup = BeautifulSoup(html, "html.parser")

        results = []
        seen_hrefs: set[str] = set()

        # 検索結果から一番くじ商品のリンクを取得
        for a in soup.find_all("a", href=re.compile(r"/1bankuji/1bankuji_\d{6}/1bankuji_\w+")):
            href: str = a.get("href", "")
            if not href or href in seen_hrefs:
                continue
            seen_hrefs.add(href)

            raw_title = a.get_text(separator=" ", strip=True)
            if not raw_title:
                continue

            full_url = KUJIMAP_BASE + href if href.startswith("/") else href
            results.append({"url": full_url, "title": raw_title})

        return results
    except Exception as e:
        log("warning", message=f"검색 오류 ({keyword}): {e}")
        return []


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
            # 두 번째 컬럼부터 순서대로 확인 - 순수 정수면 티켓 수
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
    """Prize 목록에 count 필드 설정. 변경 있으면 True 반환.

    ラストワン賞는 kujimap에 등재되지 않는 경우가 많으므로 count가 없으면 1로 채운다.
    """
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
        elif grade == "ラストワン賞" and not prize.get("count"):
            prize["count"] = 1
            changed = True

    if changed:
        product["kujimap_url"] = kujimap_url

    return changed


async def try_match_product(page, product: dict, candidate_list: list[dict]) -> tuple[dict | None, float]:
    """candidate_list에서 제목 유사도가 가장 높은 상품을 반환."""
    best_match: dict | None = None
    best_score = 0.0
    for kp in candidate_list:
        score = title_similarity(product["title"], kp["title"])
        if score > best_score:
            best_score = score
            best_match = kp
    return best_match, best_score


async def try_search_match(page, product: dict) -> tuple[dict | None, float]:
    """제목에서 키워드를 추출하여 kujimap 검색 후 가장 유사한 결과를 반환."""
    keyword = extract_search_keyword(product["title"])
    if len(keyword) < 2:
        return None, 0.0

    search_results = await search_kujimap(page, keyword)
    if not search_results:
        return None, 0.0

    return await try_match_product(page, product, search_results)


async def process_product(page, product: dict, candidate_list: list[dict] | None, search_only: bool) -> str:
    """단일 상품 처리. 반환값: 'updated', 'no_counts', 'no_match'"""
    MATCH_THRESHOLD = 0.45
    best_match: dict | None = None
    best_score = 0.0

    # 1단계: 월별 목록에서 매칭 (search_only가 아닌 경우)
    if not search_only and candidate_list:
        best_match, best_score = await try_match_product(page, product, candidate_list)

    # 2단계: 월별 매칭 실패 시 검색으로 폴백
    if best_match is None or best_score < MATCH_THRESHOLD:
        search_match, search_score = await try_search_match(page, product)
        if search_match and search_score > best_score:
            best_match = search_match
            best_score = search_score
            if best_score >= MATCH_THRESHOLD:
                log("progress",
                    message=f"  검색 매칭 ({best_score:.2f}) {product['slug']} ↔ \"{best_match['title'][:35]}\"")

    if best_match is None or best_score < MATCH_THRESHOLD:
        log("warning",
            message=f"  매칭 실패 ({best_score:.2f}): {product['slug']} - \"{product['title'][:40]}\"")
        return "no_match"

    if best_score >= MATCH_THRESHOLD and not search_only:
        log("progress",
            message=f"  매칭 ({best_score:.2f}) {product['slug']} ↔ \"{best_match['title'][:35]}\"")

    counts, total = await fetch_ticket_counts(page, best_match["url"])

    if not counts:
        log("warning", message=f"  티켓 수 없음: {product['slug']}")
        await page.wait_for_timeout(600)
        return "no_counts"

    total_str = f" (총 {total}장)" if total else ""
    log("progress", message=f"  ✓ {product['slug']}{total_str}: {counts}")

    if apply_counts_to_product(product, counts, best_match["url"]):
        await page.wait_for_timeout(800)
        return "updated"

    await page.wait_for_timeout(800)
    return "no_change"


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--slug",    help="특정 상품 slug만 처리")
    parser.add_argument("--month",   help="특정 월만 처리 (YYYYMM)")
    parser.add_argument("--refetch", action="store_true", help="이미 count 있는 상품도 재확인")
    parser.add_argument("--search-only", action="store_true", help="검색 기반 매칭만 사용 (월별 목록 스킵)")
    args = parser.parse_args()

    log("progress", message="데이터 로드 중...", percent=0)
    products: list[dict] = load_all_products()

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

            kujimap_list: list[dict] = []
            if not args.search_only:
                log("progress",
                    message=f"[{mi+1}/{total_months}] {yyyymm[:4]}년 {int(yyyymm[4:])}월 kujimap 목록 조회...",
                    percent=base_pct)

                kujimap_list = await fetch_month_listing(page, yyyymm)
                if kujimap_list:
                    log("progress",
                        message=f"  kujimap {yyyymm}: {len(kujimap_list)}개 상품 발견",
                        percent=base_pct + 1)
            else:
                log("progress",
                    message=f"[{mi+1}/{total_months}] {yyyymm[:4]}년 {int(yyyymm[4:])}월 검색 매칭...",
                    percent=base_pct)

            month_updated = 0
            for product in by_month[yyyymm]:
                result = await process_product(page, product, kujimap_list, args.search_only)
                if result == "updated":
                    updated_count += 1
                    month_updated += 1
                elif result in ("no_match", "no_counts"):
                    failed_count += 1

            # 매 월 처리 후 중간 저장 (중단해도 진행분 유지)
            if month_updated > 0:
                save_by_year(products)
                log("progress",
                    message=f"  💾 {yyyymm} 저장 완료 (이번 달 +{month_updated}, 누적 {updated_count})",
                    percent=base_pct + 4)

        await browser.close()

    # 최종 저장
    save_by_year(products)

    log("done",
        message=f"완료 - 업데이트 {updated_count}개, 실패/스킵 {failed_count}개 (총 {len(products)}개)",
        updated=updated_count,
        failed=failed_count,
        total=len(products))


if __name__ == "__main__":
    asyncio.run(main())
