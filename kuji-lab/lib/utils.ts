/**
 * Shared utility functions used across ProductGrid, ProductDetail, etc.
 */

/**
 * Normalize sale_type values (which may be translated or variant strings)
 * to canonical Japanese form: '店頭販売' or 'オンライン販売'.
 */
export function normalizeSaleType(types: string[]): string[] {
  return types.map(t => {
    if (t.includes('店頭') || t.includes('Store') || t.includes('매장') || t.includes('점포')) return '店頭販売'
    if (t.includes('オンライン') || t.includes('online') || t.includes('온라인')) return 'オンライン販売'
    return t
  })
}

/**
 * Format a Japanese date string like "2026年04月04日" into a locale-appropriate format.
 */
export function formatReleaseDate(dateStr: string, locale: string): string {
  const match = dateStr.match(/(\d{4})年(\d{2})月(\d{2})日/)
  if (!match) return dateStr
  const [, year, month, day] = match
  const y = parseInt(year), m = parseInt(month), d = parseInt(day)
  if (locale === 'ja') return dateStr
  if (locale === 'ko') return `${y}년 ${m}월 ${d}일`
  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December']
  return `${monthNames[m - 1]} ${d}, ${y}`
}

/**
 * Extract the grade from a Prize, falling back to parsing full_name.
 */
export function getPrizeGrade(prize: { grade: string; full_name: string }): string {
  if (prize.grade) return prize.grade
  const m = prize.full_name.match(/^([A-Z]賞|ラストワン賞)/)
  return m ? m[1] : ''
}

/**
 * Get the single-character grade label for display (e.g. 'A', 'B', '★').
 */
export function getGradeLetter(grade: string): string {
  const m = grade.match(/^([A-Z])賞$/)
  if (m) return m[1]
  if (grade === 'ラストワン賞') return '★'
  return '?'
}

/**
 * Grade badge color mapping.
 */
export const GRADE_COLORS: Record<string, string> = {
  'A賞': 'bg-yellow-400 text-yellow-900',
  'B賞': 'bg-sky-500 text-white',
  'C賞': 'bg-emerald-500 text-white',
  'D賞': 'bg-orange-400 text-white',
  'E賞': 'bg-pink-500 text-white',
  'F賞': 'bg-violet-500 text-white',
  'G賞': 'bg-red-500 text-white',
  'H賞': 'bg-teal-500 text-white',
  'I賞': 'bg-indigo-500 text-white',
  'ラストワン賞': 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white',
}
