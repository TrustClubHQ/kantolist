'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'

export function SearchBar({ defaultValue = '' }: { defaultValue?: string }) {
  const router = useRouter()
  const params = useSearchParams()
  const [q, setQ] = useState(defaultValue)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    // Preserve the filters already applied — searching within a category
    // should narrow it, not throw it away.
    const next = new URLSearchParams(params.toString())
    if (q.trim()) next.set('q', q.trim())
    else next.delete('q')
    next.delete('page')
    router.push(`/browse?${next.toString()}`)
  }

  return (
    <form onSubmit={submit} className="flex gap-2">
      <div className="hard flex min-h-[52px] flex-1 items-center gap-2.5 border-[3px] border-ink bg-panel px-3">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#17130E" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true" className="shrink-0">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Motorcycle, videoke, mechanic…"
          aria-label="Search listings"
          className="label !min-h-0 !border-0 !bg-transparent !px-0 text-[18px] placeholder:text-muted"
        />
      </div>
      <button
        type="submit"
        className="font-display hard shrink-0 border-[3px] border-ink bg-red px-4 text-[19px] uppercase text-ground"
      >
        Find
      </button>
    </form>
  )
}
