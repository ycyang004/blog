import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'ryuchan-post-likes'

interface LikesData {
  [slug: string]: { count: number; liked: boolean }
}

function loadLikes(): LikesData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveLikes(data: LikesData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch { /* storage full */ }
}

export default function LikeButton({ slug }: { slug: string }) {
  const [count, setCount] = useState(0)
  const [liked, setLiked] = useState(false)
  const [animating, setAnimating] = useState(false)

  // Hydrate from localStorage on mount
  useEffect(() => {
    const data = loadLikes()
    const entry = data[slug]
    if (entry) {
      setCount(entry.count)
      setLiked(entry.liked)
    }
  }, [slug])

  const toggle = useCallback(() => {
    const data = loadLikes()
    const entry = data[slug] || { count: 0, liked: false }

    if (entry.liked) {
      // Unlike
      entry.liked = false
      entry.count = Math.max(0, entry.count - 1)
    } else {
      // Like
      entry.liked = true
      entry.count += 1
      setAnimating(true)
      setTimeout(() => setAnimating(false), 400)
    }

    data[slug] = entry
    saveLikes(data)
    setCount(entry.count)
    setLiked(entry.liked)
  }, [slug])

  return (
    <button
      onClick={toggle}
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
