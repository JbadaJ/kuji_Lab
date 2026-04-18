export type Locale = 'ko' | 'ja' | 'en'

export const LOCALES = ['ko', 'ja', 'en'] as const

export const LOCALE_NAMES: Record<Locale, string> = {
  ko: '한국어',
  ja: '日本語',
  en: 'English',
}

export interface Translations {
  // Footer
  footerDisclaimer: string
  footerNoRevenue: string
  footerBugReport: string
  footerCopyright: string
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
  // Simulator — playing
  simulatorResults: string
  simulatorReset: string
  simulatorFinished: string
  simulatorDrawAgain: string
  simulatorDrawRandom: string   // {count} placeholder
  simulatorPullHint: string
  simulatorConfirm: string
  simulatorSetupButton: string
  simulatorProbButton: string
  simulatorSessionLeft: string  // {count}
  simulatorStatusTab: string
  simulatorSessionDone: string  // {count}
  simulatorCostUsed: string
  simulatorChangeSetup: string
  simulatorSameAgain: string
  simulatorLastOneMsg: string
  // Simulator — setup screen
  simulatorSetupTitle: string
  simulatorStartMode: string
  simulatorModeDefault: string
  simulatorModeDefaultSub: string
  simulatorModeRandom: string
  simulatorModeRandomSub: string
  simulatorModeCustom: string
  simulatorModeCustomSub: string
  simulatorRandomDesc: string
  simulatorPreDrawnLabel: string
  simulatorPresetClear: string
  simulatorOf: string
  simulatorPreDrawnSummary: string  // {drawn}, {remaining}
  simulatorDrawLimitSection: string
  simulatorDrawLimitToggle: string
  simulatorDrawLimitDesc: string
  simulatorDrawsLabel: string
  simulatorDrawUnit: string
  simulatorTicketsRemaining: string  // {count}
  simulatorSessionDrawsCount: string // {count}
  simulatorEstimatedCost: string
  simulatorRealData: string
  simulatorEstimatedData: string
  simulatorNoTickets: string
  simulatorStart: string
  simulatorPerDraw: string
  // Simulator — status board
  simulatorRemaining: string
  simulatorCompleted: string
  simulatorDrawnCount: string
  simulatorTotalCount: string
  // Simulator — probability modal
  simulatorProbTitle: string
  simulatorProbSubtitle: string    // {count}
  simulatorProbCombined: string
  simulatorProbRemainingInfo: string // {remaining}, {total}
  simulatorProbHint: string
  simulatorProbClear: string
  // Simulator — drawn panel
  simulatorMyDraws: string
  simulatorPreDrawnSection: string
  simulatorNoDrawnYet: string
  simulatorPreDrawnEmpty: string
  // IP categories
  categoryShonen: string
  categoryShoujo: string
  categoryGames: string
  categoryRobot: string
  categoryTokusatsu: string
  categoryIdol: string
  categoryWestern: string
  // Wishlist
  wishlistTab: string
  wishlistEmpty: string
  wishlistCount: string       // {count}
  wishlistAdd: string
  wishlistRemove: string
  // Draw History
  historyTab: string
  historyEmpty: string
  historyDrawCount: string    // {count}
  historyClear: string
  historyFinished: string
  historySessionCount: string // {count}
  // Auto Draw
  autoDrawButton: string
  autoDrawTitle: string
  autoDrawGoalLabel: string
  autoDrawGoalGrade: string
  autoDrawGoalAll: string
  autoDrawGoalCount: string
  autoDrawGoalGradeSelect: string
  autoDrawSpeedLabel: string
  autoDrawSpeedFast: string
  autoDrawSpeedNormal: string
  autoDrawSpeedSlow: string
  autoDrawStart: string
  autoDrawCancel: string
  autoDrawProgress: string    // {count}
  autoDrawResultTitle: string
  autoDrawResultTotal: string // {count}
  autoDrawResultCost: string
  autoDrawResultGoalMet: string
  autoDrawResultNoMore: string
  autoDrawClose: string
}

export const translations: Record<Locale, Translations> = {
  ko: {
    footerDisclaimer: '이 사이트는 Ichiban Kuji 팬이 만든 비공식 팬사이트입니다. 모든 이미지와 상품 정보의 저작권은 BANDAI SPIRITS 및 각 원저작권자에게 있습니다.',
    footerNoRevenue: '이 사이트는 광고·수익 없이 순수 팬 목적으로 운영됩니다.',
    footerBugReport: '버그 제보',
    footerCopyright: '© 2026 一番くじ Lab · 비상업적 팬 프로젝트 · 저작권은 원저작권자에게 있습니다',
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
    simulatorSetupButton: '설정',
    simulatorProbButton: '확률',
    simulatorSessionLeft: '세션 {count}회 남음',
    simulatorStatusTab: '현황판',
    simulatorSessionDone: '설정한 {count}회 완료',
    simulatorCostUsed: '사용',
    simulatorChangeSetup: '설정 변경',
    simulatorSameAgain: '같은 설정으로 다시',
    simulatorLastOneMsg: '마지막 1장을 뽑은 행운의 주인공!',
    simulatorSetupTitle: '뽑기 설정',
    simulatorStartMode: '시작 방식',
    simulatorModeDefault: '기본',
    simulatorModeDefaultSub: '전체 티켓으로 처음부터',
    simulatorModeRandom: '랜덤',
    simulatorModeRandomSub: '이미 뽑힌 수 무작위',
    simulatorModeCustom: '상세 설정',
    simulatorModeCustomSub: '등급별 직접 설정',
    simulatorRandomDesc: '시작 시 각 등급의 티켓 일부가 이미 뽑혀있는 상태로 시작합니다. 뽑을수록 희귀 상품 확률이 올라가는 상황을 시뮬레이션합니다.',
    simulatorPreDrawnLabel: '등급별 이미 뽑힌 수',
    simulatorPresetClear: '초기화',
    simulatorOf: '장 중',
    simulatorPreDrawnSummary: '{drawn}장 이미 뽑힘 → 남은 티켓 {remaining}장',
    simulatorDrawLimitSection: '이번 세션 뽑기 횟수',
    simulatorDrawLimitToggle: '횟수 제한',
    simulatorDrawLimitDesc: '설정한 횟수만큼만 뽑고 자동 종료',
    simulatorDrawsLabel: '뽑을 횟수',
    simulatorDrawUnit: '회',
    simulatorTicketsRemaining: '남은 티켓 {count}장',
    simulatorSessionDrawsCount: '이번 세션 {count}회',
    simulatorEstimatedCost: '예상 비용',
    simulatorRealData: '실제 구성 데이터 반영',
    simulatorEstimatedData: '추정 구성 (kujimap 데이터 미등록)',
    simulatorNoTickets: '뽑을 티켓이 없습니다',
    simulatorStart: '시작하기',
    simulatorPerDraw: '1회',
    simulatorRemaining: '남음',
    simulatorCompleted: '완료',
    simulatorDrawnCount: '뽑힘',
    simulatorTotalCount: '전체',
    simulatorProbTitle: '다음 뽑기 확률',
    simulatorProbSubtitle: '남은 티켓 {count}장 기준 · 등급을 눌러 합산',
    simulatorProbCombined: '중 하나 뽑을 확률',
    simulatorProbRemainingInfo: '해당 등급 남은 티켓 {remaining}장 / 전체 {total}장',
    simulatorProbHint: '여러 등급을 선택하면 합산 확률을 계산해요',
    simulatorProbClear: '선택 초기화',
    simulatorMyDraws: '내가 뽑은 결과',
    simulatorPreDrawnSection: '기존 뽑힌 결과',
    simulatorNoDrawnYet: '아직 없음',
    simulatorPreDrawnEmpty: '설정에서 뽑힌 티켓 없음',
    categoryShonen: '소년 만화',
    categoryShoujo: '소녀/마법소녀',
    categoryGames: '게임',
    categoryRobot: '로봇/SF',
    categoryTokusatsu: '특촬/어린이',
    categoryIdol: '아이돌/음악',
    categoryWestern: '디즈니/서양',
    wishlistTab: '찜 목록',
    wishlistEmpty: '찜한 상품이 없습니다.',
    wishlistCount: '{count}개 찜',
    wishlistAdd: '찜하기',
    wishlistRemove: '찜 해제',
    historyTab: '기록',
    historyEmpty: '뽑기 기록이 없습니다',
    historyDrawCount: '{count}회 뽑음',
    historyClear: '기록 초기화',
    historyFinished: '전체 완료',
    historySessionCount: '총 {count}회',
    autoDrawButton: '자동 뽑기',
    autoDrawTitle: '자동 뽑기 설정',
    autoDrawGoalLabel: '뽑기 목표',
    autoDrawGoalGrade: '목표 등급이 나올 때까지',
    autoDrawGoalAll: '전부 뽑기',
    autoDrawGoalCount: 'N번 뽑기',
    autoDrawGoalGradeSelect: '목표 등급 선택',
    autoDrawSpeedLabel: '속도',
    autoDrawSpeedFast: '빠름',
    autoDrawSpeedNormal: '보통',
    autoDrawSpeedSlow: '느림',
    autoDrawStart: '자동 뽑기 시작',
    autoDrawCancel: '중단',
    autoDrawProgress: '{count}번 뽑는 중...',
    autoDrawResultTitle: '자동 뽑기 결과',
    autoDrawResultTotal: '총 {count}번 뽑음',
    autoDrawResultCost: '총 비용',
    autoDrawResultGoalMet: '목표 달성!',
    autoDrawResultNoMore: '티켓 소진',
    autoDrawClose: '닫기',
  },
  ja: {
    footerDisclaimer: 'このサイトはIchiban Kujiのファンが作った非公式ファンサイトです。すべての画像・商品情報の著作権はBANDAI SPIRITSおよび各原著作権者に帰属します。',
    footerNoRevenue: 'このサイトは広告・収益なしの純粋なファン活動として運営されています。',
    footerBugReport: 'バグ報告',
    footerCopyright: '© 2026 一番くじ Lab · 非営利ファンプロジェクト · 著作権は原著作権者に帰属します',
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
    simulatorSetupButton: '設定',
    simulatorProbButton: '確率',
    simulatorSessionLeft: 'セッション残り{count}回',
    simulatorStatusTab: '現況',
    simulatorSessionDone: '設定した{count}回完了',
    simulatorCostUsed: '使用',
    simulatorChangeSetup: '設定を変更',
    simulatorSameAgain: '同じ設定でもう一度',
    simulatorLastOneMsg: '最後の1枚を引いた幸運の主人公！',
    simulatorSetupTitle: '抽選設定',
    simulatorStartMode: '開始方法',
    simulatorModeDefault: 'デフォルト',
    simulatorModeDefaultSub: '全チケットで最初から',
    simulatorModeRandom: 'ランダム',
    simulatorModeRandomSub: '引き済みをランダム設定',
    simulatorModeCustom: 'カスタム',
    simulatorModeCustomSub: '等級別に設定',
    simulatorRandomDesc: '開始時に各等級のチケットが一部引き済みの状態からスタートします。引くほどレアアイテムの確率が上がる状況をシミュレーションします。',
    simulatorPreDrawnLabel: '等級別引き済み数',
    simulatorPresetClear: 'リセット',
    simulatorOf: '枚中',
    simulatorPreDrawnSummary: '{drawn}枚引き済み → 残りチケット{remaining}枚',
    simulatorDrawLimitSection: 'このセッションの回数',
    simulatorDrawLimitToggle: '回数制限',
    simulatorDrawLimitDesc: '設定した回数だけ引いて自動終了',
    simulatorDrawsLabel: '回数',
    simulatorDrawUnit: '回',
    simulatorTicketsRemaining: '残りチケット{count}枚',
    simulatorSessionDrawsCount: 'このセッション{count}回',
    simulatorEstimatedCost: '予想費用',
    simulatorRealData: '実際の構成データを反映',
    simulatorEstimatedData: '推定構成（kujimap未登録）',
    simulatorNoTickets: '引けるチケットがありません',
    simulatorStart: '開始する',
    simulatorPerDraw: '1回',
    simulatorRemaining: '残り',
    simulatorCompleted: '完了',
    simulatorDrawnCount: '引いた',
    simulatorTotalCount: '全体',
    simulatorProbTitle: '次の抽選確率',
    simulatorProbSubtitle: '残り{count}枚基準・等級をタップして合算',
    simulatorProbCombined: 'のどれかを引く確率',
    simulatorProbRemainingInfo: '対象等級の残り{remaining}枚 / 全体{total}枚',
    simulatorProbHint: '複数の等級を選ぶと合算確率を計算します',
    simulatorProbClear: '選択リセット',
    simulatorMyDraws: '引いた結果',
    simulatorPreDrawnSection: '設定済み',
    simulatorNoDrawnYet: 'まだなし',
    simulatorPreDrawnEmpty: '設定で引いたチケットなし',
    categoryShonen: '少年漫画',
    categoryShoujo: '少女／魔法少女',
    categoryGames: 'ゲーム',
    categoryRobot: 'ロボット／SF',
    categoryTokusatsu: '特撮／子供向け',
    categoryIdol: 'アイドル／音楽',
    categoryWestern: 'ディズニー／洋画',
    wishlistTab: 'お気に入り',
    wishlistEmpty: 'お気に入りがありません。',
    wishlistCount: 'お気に入り{count}件',
    wishlistAdd: 'お気に入り追加',
    wishlistRemove: 'お気に入り解除',
    historyTab: '履歴',
    historyEmpty: '記録がありません',
    historyDrawCount: '{count}回抽選',
    historyClear: '記録を削除',
    historyFinished: '全完了',
    historySessionCount: '合計{count}回',
    autoDrawButton: '自動抽選',
    autoDrawTitle: '自動抽選設定',
    autoDrawGoalLabel: '目標',
    autoDrawGoalGrade: '目標等級が出るまで',
    autoDrawGoalAll: 'すべて引く',
    autoDrawGoalCount: 'N回引く',
    autoDrawGoalGradeSelect: '目標等級を選択',
    autoDrawSpeedLabel: 'スピード',
    autoDrawSpeedFast: '速い',
    autoDrawSpeedNormal: '普通',
    autoDrawSpeedSlow: '遅い',
    autoDrawStart: '自動抽選開始',
    autoDrawCancel: '中断',
    autoDrawProgress: '{count}回抽選中...',
    autoDrawResultTitle: '自動抽選結果',
    autoDrawResultTotal: '合計{count}回',
    autoDrawResultCost: '合計費用',
    autoDrawResultGoalMet: '目標達成！',
    autoDrawResultNoMore: 'チケット終了',
    autoDrawClose: '閉じる',
  },
  en: {
    footerDisclaimer: 'This is an unofficial fan site created by an Ichiban Kuji fan. All images and product information are copyright of BANDAI SPIRITS and their respective owners.',
    footerNoRevenue: 'This site is operated purely as a fan project with no ads or revenue.',
    footerBugReport: 'Report a Bug',
    footerCopyright: '© 2026 一番くじ Lab · Non-commercial Fan Project · All rights reserved to original copyright holders',
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
    simulatorSetupButton: 'Setup',
    simulatorProbButton: 'Odds',
    simulatorSessionLeft: '{count} draws left',
    simulatorStatusTab: 'Status',
    simulatorSessionDone: '{count} draws complete',
    simulatorCostUsed: 'spent',
    simulatorChangeSetup: 'Change Setup',
    simulatorSameAgain: 'Draw again (same settings)',
    simulatorLastOneMsg: 'You drew the last ticket!',
    simulatorSetupTitle: 'Draw Settings',
    simulatorStartMode: 'Start Mode',
    simulatorModeDefault: 'Default',
    simulatorModeDefaultSub: 'Start fresh with all tickets',
    simulatorModeRandom: 'Random',
    simulatorModeRandomSub: 'Randomize pre-drawn count',
    simulatorModeCustom: 'Custom',
    simulatorModeCustomSub: 'Set per grade manually',
    simulatorRandomDesc: 'Starts with some tickets already drawn per grade. Simulates a scenario where rare item probability increases as more tickets are drawn.',
    simulatorPreDrawnLabel: 'Pre-drawn per grade',
    simulatorPresetClear: 'Clear',
    simulatorOf: 'of',
    simulatorPreDrawnSummary: '{drawn} pre-drawn → {remaining} tickets remaining',
    simulatorDrawLimitSection: 'Session Draw Limit',
    simulatorDrawLimitToggle: 'Limit draws',
    simulatorDrawLimitDesc: 'Auto-stop after the set number of draws',
    simulatorDrawsLabel: 'Draws',
    simulatorDrawUnit: '',
    simulatorTicketsRemaining: '{count} tickets left',
    simulatorSessionDrawsCount: 'Session: {count} draws',
    simulatorEstimatedCost: 'Est. cost',
    simulatorRealData: 'Real composition data',
    simulatorEstimatedData: 'Estimated (no kujimap data)',
    simulatorNoTickets: 'No tickets to draw',
    simulatorStart: 'Start',
    simulatorPerDraw: 'Per draw',
    simulatorRemaining: 'Left',
    simulatorCompleted: 'Done',
    simulatorDrawnCount: 'Drawn',
    simulatorTotalCount: 'Total',
    simulatorProbTitle: 'Draw Probability',
    simulatorProbSubtitle: 'Based on {count} remaining · tap grades to combine',
    simulatorProbCombined: 'chance of drawing any of',
    simulatorProbRemainingInfo: '{remaining} of selected / {total} total remaining',
    simulatorProbHint: 'Select multiple grades to see combined probability',
    simulatorProbClear: 'Clear selection',
    simulatorMyDraws: 'My draws',
    simulatorPreDrawnSection: 'Pre-drawn',
    simulatorNoDrawnYet: 'None yet',
    simulatorPreDrawnEmpty: 'No pre-drawn tickets set',
    categoryShonen: 'Shonen Manga',
    categoryShoujo: 'Shoujo / Magical Girl',
    categoryGames: 'Games',
    categoryRobot: 'Mecha / Sci-Fi',
    categoryTokusatsu: 'Tokusatsu / Kids',
    categoryIdol: 'Idol / Music',
    categoryWestern: 'Disney / Western',
    wishlistTab: 'Wishlist',
    wishlistEmpty: 'No wishlisted items.',
    wishlistCount: '{count} wishlisted',
    wishlistAdd: 'Add to wishlist',
    wishlistRemove: 'Remove from wishlist',
    historyTab: 'History',
    historyEmpty: 'No draw history yet',
    historyDrawCount: '{count} draws',
    historyClear: 'Clear History',
    historyFinished: 'All drawn',
    historySessionCount: '{count} total',
    autoDrawButton: 'Auto Draw',
    autoDrawTitle: 'Auto Draw Settings',
    autoDrawGoalLabel: 'Draw Goal',
    autoDrawGoalGrade: 'Until target grade',
    autoDrawGoalAll: 'Draw all',
    autoDrawGoalCount: 'Draw N times',
    autoDrawGoalGradeSelect: 'Select target grade',
    autoDrawSpeedLabel: 'Speed',
    autoDrawSpeedFast: 'Fast',
    autoDrawSpeedNormal: 'Normal',
    autoDrawSpeedSlow: 'Slow',
    autoDrawStart: 'Start Auto Draw',
    autoDrawCancel: 'Cancel',
    autoDrawProgress: 'Drawing {count}...',
    autoDrawResultTitle: 'Auto Draw Results',
    autoDrawResultTotal: '{count} total draws',
    autoDrawResultCost: 'Total Cost',
    autoDrawResultGoalMet: 'Goal reached!',
    autoDrawResultNoMore: 'Tickets exhausted',
    autoDrawClose: 'Close',
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
