import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center px-4">
      <div className="text-center space-y-4 max-w-md">
        <p className="text-7xl font-black text-zinc-200 dark:text-zinc-800">404</p>
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
          Page Not Found
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          ページが見つかりません · 페이지를 찾을 수 없습니다
        </p>
        <Link
          href="/"
          className="inline-block mt-4 px-6 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors"
        >
          Back to Home
        </Link>
      </div>
    </div>
  )
}
