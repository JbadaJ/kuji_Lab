export default function Loading() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header skeleton */}
      <div className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <div className="h-5 w-16 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
          <div className="h-4 w-px bg-zinc-300 dark:bg-zinc-700" />
          <div className="h-5 w-24 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Banner skeleton */}
        <div className="w-full aspect-video rounded-2xl bg-zinc-200 dark:bg-zinc-800 animate-pulse" />

        {/* Title & meta */}
        <div className="space-y-4">
          <div className="h-7 w-3/4 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
          <div className="flex gap-6">
            <div className="h-4 w-28 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
            <div className="h-4 w-20 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
            <div className="h-4 w-24 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
          </div>
          <div className="flex gap-2">
            <div className="h-7 w-16 bg-zinc-200 dark:bg-zinc-800 rounded-full animate-pulse" />
            <div className="h-7 w-20 bg-zinc-200 dark:bg-zinc-800 rounded-full animate-pulse" />
          </div>
          <div className="flex gap-2 pt-2">
            <div className="h-10 w-28 bg-zinc-200 dark:bg-zinc-800 rounded-full animate-pulse" />
            <div className="h-10 w-28 bg-zinc-200 dark:bg-zinc-800 rounded-full animate-pulse" />
          </div>
        </div>

        {/* Prize list skeleton */}
        <div className="space-y-3">
          <div className="h-5 w-24 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex gap-3 p-4 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700">
              <div className="w-20 h-20 rounded-lg bg-zinc-200 dark:bg-zinc-700 animate-pulse flex-shrink-0" />
              <div className="flex-1 space-y-2 py-1">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-10 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
                  <div className="h-4 w-40 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
                </div>
                <div className="h-3 w-16 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
