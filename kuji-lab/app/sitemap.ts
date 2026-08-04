import type { MetadataRoute } from 'next'
import { getValidProducts } from '@/lib/data'

const BASE_URL = 'https://kuji-lab.vercel.app'

export default function sitemap(): MetadataRoute.Sitemap {
  const products: MetadataRoute.Sitemap = getValidProducts().map(p => {
    const lastModified = p.scraped_at ? new Date(p.scraped_at) : undefined
    return {
      url: `${BASE_URL}/products/${encodeURIComponent(p.slug)}`,
      ...(lastModified && !isNaN(lastModified.getTime()) ? { lastModified } : {}),
    }
  })

  return [
    { url: BASE_URL, changeFrequency: 'daily', priority: 1 },
    ...products,
  ]
}
