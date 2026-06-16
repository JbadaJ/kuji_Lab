import type { Metadata } from 'next'
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

export default async function ProductPage({ params, searchParams }: Props) {
  const { slug } = await params
  const sp = await searchParams
  const product = getProductBySlug(slug)

  if (!product || !product.title) {
    notFound()
  }

  return <ProductDetail product={product} initialSim={sp} />
}
