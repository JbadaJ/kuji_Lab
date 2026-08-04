import { getProductSummaries, getAvailableYears } from '@/lib/data'
import { HOME_PAGE_SIZE } from '@/lib/utils'
import Header from './components/Header'
import ProductGrid from './components/ProductGrid'

export default function Home() {
  const products = getProductSummaries()
  const years = getAvailableYears()

  // 첫 페이지 분량만 서버에서 내려보내고, 나머지는 클라이언트가
  // /api/summaries 에서 지연 로드한다 (전체 ~2,500개 직렬화 방지).
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Header productCount={products.length} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <ProductGrid
          initialProducts={products.slice(0, HOME_PAGE_SIZE)}
          totalCount={products.length}
          years={years}
        />
      </main>
    </div>
  )
}
