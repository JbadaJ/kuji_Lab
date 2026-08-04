import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getProductBySlug } from '@/lib/data'
import ProductDetail from './ProductDetail'

// 시뮬레이터 딥링크(?sim=...)는 ProductDetail이 클라이언트에서 파싱하므로
// 이 페이지는 searchParams에 의존하지 않는다 → ISR 캐시 가능
export const revalidate = 86400

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const product = getProductBySlug(slug)
  if (!product || !product.title) return {}

  const description = [
    product.prize_count > 0 ? `${product.prize_count} prizes` : '',
    product.price_yen ? `¥${product.price_yen} per draw` : '',
    'Ichiban Kuji draw simulator',
  ].filter(Boolean).join(' · ')

  return {
    title: product.title,
    description,
    openGraph: {
      title: product.title,
      description,
      images: product.banner_image_url
        ? [{ url: product.banner_image_url, width: 1200, height: 630 }]
        : [],
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: product.title,
      images: product.banner_image_url ? [product.banner_image_url] : [],
    },
  }
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params
  const product = getProductBySlug(slug)

  if (!product || !product.title) {
    notFound()
  }

  return <ProductDetail product={product} />
}
