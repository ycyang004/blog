import { useState, useEffect, useCallback, useRef } from 'react'

const STORAGE_KEY = 'ryuchan-post-likes'

interface LocalLikeState {
  [slug: string]: boolean // true = this browser has liked
}

function getLocalLiked(slug: string): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return false
    const data: LocalLikeState = JSON.parse(raw)
    return !!data[slug]
  } catch {
    return false
  }
}

function setLocalLiked(slug: string, liked: boolean) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const data: LocalLikeState = raw ? JSON.parse(raw) : {}
    data[slug] = liked
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch { /* storage full */ }
}

async function fetchCount(slug: string): Promise<number> {
  try {
    const res = await fetch(`/api/likes?slug=${encodeURIComponent(slug)}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    return typeof json.count === 'number' ? json.count : 0
  } catch {
    throw new Error('Network error')
  }
}

async function postLike(slug: string, action: 'like' | 'unlike'): Promise<number> {
  const res = await fetch('/api/likes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug, action }),
  })
  if (!res.ok) {
    const json = await res.json().catch(() => ({}))
    throw new Error(json.error || `HTTP ${res.status}`)
  }
  const json = await res.json()
  return json.count
}

export default function LikeButton({ slug }: { slug: string }) {
  const [count, setCount] = useState(0)
  const [liked, setLiked] = useState(() => getLocalLiked(slug))
  const [animating, setAnimating] = useState(false)
  const [loading, setLoading] = useState(true)
  const pendingRef = useRef(false) // prevents double-click while request is in flight

  // On mount: fetch server count
  useEffect(() => {
    const localLiked = getLocalLiked(slug)
    // Show a fallback count while fetching (at least 1 if locally liked)
    if (localLiked) setCount(1)

    fetchCount(slug)
      .then((serverCount) => {
        setCount(serverCount)
      })
      .catch(() => {
        // If fetch fails, keep the local fallback count
      })
      .finally(() => {
        setLoading(false)
      })
  }, [slug])

  const toggle = useCallback(async () => {
    if (pendingRef.current) return
    pendingRef.current = true

    const wasLiked = liked
    const newLiked = !wasLiked
    const action = newLiked ? 'like' : 'unlike'

    // Optimistic update
    setLiked(newLiked)
    setLocalLiked(slug, newLiked)
    setCount((prev) => (newLiked ? prev + 1 : Math.max(0, prev - 1)))
    if (newLiked) {
      setAnimating(true)
      setTimeout(() => setAnimating(false), 400)
    }

    try {
      const serverCount = await postLike(slug, action)
      setCount(serverCount)
    } catch {
      // Revert on failure
      setLiked(wasLiked)
      setLocalLiked(slug, wasLiked)
      setCount((prev) => (wasLiked ? prev + 1 : Math.max(0, prev - 1)))
    } finally {
      pendingRef.current = false
    }
  }, [slug, liked])

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`btn btn-sm gap-1.5 transition-all duration-200 ${
        liked
          ? 'btn-error text-error-content'
          : 'btn-outline hover:btn-error hover:text-error-content'
      }`}
      title={liked ? '取消点赞' : '点赞'}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill={liked ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`transition-transform duration-300 ${animating ? 'scale-125' : ''}`}
      >
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
      </svg>
      {count > 0 && (
        <span className={`text-xs font-semibold min-w-[1.25rem] text-center ${liked ? '' : 'text-base-content/70'}`}>
          {count}
        </span>
      )}
    </button>
  )
}
