import { getProductSummaries, getAvailableYears } from '@/lib/data'
import Header from './components/Header'
import ProductGrid from './components/ProductGrid'

export default function Home() {
  const products = getProductSummaries()
  const years = getAvailableYears()

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Header productCount={products.length} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <ProductGrid products={products} years={years} />
      </main>
    </div>
  )
}
