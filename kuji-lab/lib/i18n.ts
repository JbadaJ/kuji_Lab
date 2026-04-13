export type Locale = 'ko' | 'ja' | 'en'

export const LOCALES = ['ko', 'ja', 'en'] as const

export const LOCALE_NAMES: Record<Locale, string> = {
  ko: '한국어',
  ja: '日本語',
  en: 'English',
}

export interface Translations {
  // Header
  headerSubtitle: string       // {count} placeholder
  // Search
  searchPlaceholder: string
  // Filters
  filterYear: string
  filterMonth: string
  filterType: string
  filterCharacter: string
  filterAll: string
  filterStore: string
  filterOnline: string
  filterSelectCharacter: string
  filterClearSelection: string
  filterSearchCharacter: string
  filterNoCharacterResults: string
  filterClear: string
  // Grid
  gridCount: string            // {count}
  gridSearchSuffix: string     // {query}
  gridNoImage: string
  gridLoadMore: string
  gridRemaining: string        // {count}
  gridEmpty: string
  // Sale badges
  badgeStore: string
  badgeOnline: string
  // Product detail
  productBack: string
  productReleaseDate: string
  productPricePerDraw: string
  productPrizeCount: string    // {count}
  productGallery: string
  productPrizeList: string     // {count}
  productStores: string
  productSimulator: string
  productNoImage: string
  // Simulator
  simulatorResults: string
  simulatorReset: string
  simulatorFinished: string
  simulatorDrawAgain: string
  simulatorDrawRandom: string   // {count} placeholder
  simulatorPullHint: string
  simulatorConfirm: string
  // IP categories
  categoryShonen: string
  categoryShoujo: string
  categoryGames: string
  categoryRobot: string
  categoryTokusatsu: string
  categoryIdol: string
  categoryWestern: string
}

export const translations: Record<Locale, Translations> = {
  ko: {
    headerSubtitle: '{count}개 상품 데이터베이스',
    searchPlaceholder: '타이틀로 검색 (예: 원피스, ドラゴンボール, Gundam)',
    filterYear: '연도',
    filterMonth: '월',
    filterType: '유형',
    filterCharacter: '캐릭터',
    filterAll: '전체',
    filterStore: '점포 판매',
    filterOnline: '온라인 판매',
    filterSelectCharacter: '선택하기',
    filterClearSelection: '선택 해제',
    filterSearchCharacter: '캐릭터 검색...',
    filterNoCharacterResults: '검색 결과가 없습니다.',
    filterClear: '해제',
    gridCount: '{count}개 상품',
    gridSearchSuffix: '"{query}" 검색 결과',
    gridNoImage: '이미지 없음',
    gridLoadMore: '더 보기',
    gridRemaining: '{count}개 남음',
    gridEmpty: '검색 결과가 없습니다.',
    badgeStore: '점포',
    badgeOnline: '온라인',
    productBack: '목록으로',
    productReleaseDate: '발매일',
    productPricePerDraw: '1회',
    productPrizeCount: '{count}종류의 경품',
    productGallery: '갤러리',
    productPrizeList: '경품 목록',
    productStores: '취급점',
    productSimulator: '뽑기 시작',
    productNoImage: '이미지 없음',
    simulatorResults: '결과',
    simulatorReset: '리셋',
    simulatorFinished: '모든 티켓을 뽑았습니다!',
    simulatorDrawAgain: '다시 뽑기',
    simulatorDrawRandom: '랜덤으로 뽑기 · 남은 {count}장',
    simulatorPullHint: '오른쪽으로 드래그하여 열기',
    simulatorConfirm: '확인',
    categoryShonen: '소년 만화',
    categoryShoujo: '소녀/마법소녀',
    categoryGames: '게임',
    categoryRobot: '로봇/SF',
    categoryTokusatsu: '특촬/어린이',
    categoryIdol: '아이돌/음악',
    categoryWestern: '디즈니/서양',
  },
  ja: {
    headerSubtitle: '{count}件の商品',
    searchPlaceholder: 'タイトルで検索（例：ワンピース、ドラゴンボール）',
    filterYear: '年',
    filterMonth: '月',
    filterType: '販売形式',
    filterCharacter: 'キャラクター',
    filterAll: 'すべて',
    filterStore: '店頭販売',
    filterOnline: 'オンライン販売',
    filterSelectCharacter: '選択する',
    filterClearSelection: '選択解除',
    filterSearchCharacter: 'キャラクターを検索...',
    filterNoCharacterResults: '検索結果がありません。',
    filterClear: '解除',
    gridCount: '{count}件の商品',
    gridSearchSuffix: '「{query}」の検索結果',
    gridNoImage: '画像なし',
    gridLoadMore: 'もっと見る',
    gridRemaining: 'あと{count}件',
    gridEmpty: '検索結果がありません。',
    badgeStore: '店頭',
    badgeOnline: 'オンライン',
    productBack: '一覧へ戻る',
    productReleaseDate: '発売日',
    productPricePerDraw: '1回',
    productPrizeCount: '{count}種類の賞品',
    productGallery: 'ギャラリー',
    productPrizeList: '賞品一覧',
    productStores: '取扱店',
    productSimulator: 'シミュレーター開始',
    productNoImage: '画像なし',
    simulatorResults: '結果',
    simulatorReset: 'リセット',
    simulatorFinished: 'すべてのチケットを引きました！',
    simulatorDrawAgain: 'もう一度引く',
    simulatorDrawRandom: 'ランダムで引く · 残り{count}枚',
    simulatorPullHint: '右へドラッグして開ける',
    simulatorConfirm: '確認',
    categoryShonen: '少年漫画',
    categoryShoujo: '少女／魔法少女',
    categoryGames: 'ゲーム',
    categoryRobot: 'ロボット／SF',
    categoryTokusatsu: '特撮／子供向け',
    categoryIdol: 'アイドル／音楽',
    categoryWestern: 'ディズニー／洋画',
  },
  en: {
    headerSubtitle: '{count} products',
    searchPlaceholder: 'Search by title (e.g. One Piece, Dragon Ball, Gundam)',
    filterYear: 'Year',
    filterMonth: 'Month',
    filterType: 'Type',
    filterCharacter: 'Character',
    filterAll: 'All',
    filterStore: 'In-Store',
    filterOnline: 'Online',
    filterSelectCharacter: 'Select',
    filterClearSelection: 'Clear selection',
    filterSearchCharacter: 'Search characters...',
    filterNoCharacterResults: 'No results found.',
    filterClear: 'Clear',
    gridCount: '{count} products',
    gridSearchSuffix: 'Results for "{query}"',
    gridNoImage: 'No Image',
    gridLoadMore: 'Load more',
    gridRemaining: '{count} remaining',
    gridEmpty: 'No results found.',
    badgeStore: 'In-Store',
    badgeOnline: 'Online',
    productBack: 'Back to list',
    productReleaseDate: 'Release Date',
    productPricePerDraw: 'Per draw',
    productPrizeCount: '{count} prizes',
    productGallery: 'Gallery',
    productPrizeList: 'Prize List',
    productStores: 'Available at',
    productSimulator: 'Start Simulator',
    productNoImage: 'No Image',
    simulatorResults: 'Results',
    simulatorReset: 'Reset',
    simulatorFinished: 'All tickets drawn!',
    simulatorDrawAgain: 'Draw Again',
    simulatorDrawRandom: 'Draw Random · {count} left',
    simulatorPullHint: 'Drag right to open',
    simulatorConfirm: 'OK',
    categoryShonen: 'Shonen Manga',
    categoryShoujo: 'Shoujo / Magical Girl',
    categoryGames: 'Games',
    categoryRobot: 'Mecha / Sci-Fi',
    categoryTokusatsu: 'Tokusatsu / Kids',
    categoryIdol: 'Idol / Music',
    categoryWestern: 'Disney / Western',
  },
}

/** Translate a Japanese grade label (A賞, ラストワン賞, etc.) */
export function translateGrade(grade: string, locale: Locale): string {
  if (locale === 'ja' || !grade) return grade
  if (grade === 'ラストワン賞') return locale === 'ko' ? '라스트원상' : 'Last One'
  const match = grade.match(/^([A-Z])賞$/)
  if (match) return locale === 'ko' ? `${match[1]}상` : `Prize ${match[1]}`
  return grade
}

/** Translate 全N種 variant count text */
export function translateVariants(count: number, locale: Locale): string {
  if (locale === 'ja') return `全${count}種`
  if (locale === 'ko') return `전 ${count}종`
  return `${count} types`
}

/** Replace {key} placeholders in a translation string */
export function fmt(str: string, vars: Record<string, string | number>): string {
  return Object.entries(vars).reduce(
    (s, [k, v]) => s.replace(`{${k}}`, String(v)),
    str
  )
}
