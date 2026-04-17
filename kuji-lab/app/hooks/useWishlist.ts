'use client'

import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'kuji-wishlist'

export function useWishlist() {
  const [wishlist, setWishlist] = useState<string[]>([])

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) setWishlist(JSON.parse(stored))
    } catch {}
  }, [])

  const toggle = useCallback((slug: string) => {
    setWishlist(prev => {
      const next = prev.includes(slug)
        ? prev.filter(s => s !== slug)
        : [...prev, slug]
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch {}
      return next
    })
  }, [])

  const has = useCallback((slug: string, list?: string[]) => {
    return (list ?? wishlist).includes(slug)
  }, [wishlist])

  return { wishlist, toggle, has }
}
