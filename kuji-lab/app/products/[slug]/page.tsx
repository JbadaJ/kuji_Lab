import { notFound } from 'next/navigation'
import { getProductBySlug } from '@/lib/data'
import ProductDetail from './ProductDetail'

export interface SimSearchParams {
  sim?: string
  mode?: string
  pre?: string
  limit?: string
}

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<SimSearchParams>
}

export default async function ProductPage({ params, searchParams }: Props) {
  const { slug } = await params
  const sp = await searchParams
  const product = getProductBySlug(slug)

  if (!product || !product.title) {
    notFound()
  }

  return <ProductDetail product={product} initialSim={sp} />
}
