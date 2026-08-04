import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/api/', '/room'],
    },
    sitemap: 'https://kuji-lab.vercel.app/sitemap.xml',
  }
}
