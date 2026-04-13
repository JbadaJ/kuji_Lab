import { notFound } from 'next/navigation'
import { getProductBySlug } from '@/lib/data'
import ProductDetail from './ProductDetail'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params
  const product = getProductBySlug(slug)

  if (!product || !product.title) {
    notFound()
  }

  return <ProductDetail product={product} />
}
