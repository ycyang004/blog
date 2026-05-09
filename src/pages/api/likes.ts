/**
 * Multi-user like counting API endpoint.
 * GET  - reads a post's like count from GitHub (public, cached at edge)
 * POST - increments or decrements a post's like count (requires GITHUB_TOKEN env var)
 */

export const prerender = false

const OWNER = 'kobaridev'
const REPO = 'RyuChan'
const BRANCH = 'main'
const LIKES_PATH = 'data/likes.json'
const GH_API = 'https://api.github.com'

interface LikesData {
  [slug: string]: { count: number }
}

interface RateLimitEntry {
  count: number
  resetAt: number
}

// In-memory rate limiting (per Cloudflare Worker instance)
const ipRateLimit = new Map<string, RateLimitEntry>()
const RATE_LIMIT_MAX = 20     // max likes per window
const RATE_LIMIT_WINDOW = 60  // seconds

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = ipRateLimit.get(ip)
  if (!entry || now > entry.resetAt) {
    ipRateLimit.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW * 1000 })
    return false
  }
  if (entry.count >= RATE_LIMIT_MAX) return true
  entry.count++
  return false
}

async function readLikesFromRaw(): Promise<LikesData> {
  const url = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/${LIKES_PATH}`
  const res = await fetch(url, {
    cf: { cacheTtl: 30 },
  } as RequestInit & { cf?: any })
  if (!res.ok) return {}
  try {
    return (await res.json()) as LikesData
  } catch {
    return {}
  }
}

async function readLikesFromApi(token: string): Promise<{ data: LikesData; sha: string } | null> {
  const url = `${GH_API}/repos/${OWNER}/${REPO}/contents/${encodeURIComponent(LIKES_PATH)}?ref=${encodeURIComponent(BRANCH)}`
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  })
  if (res.status === 404) return { data: {}, sha: '' }
  if (!res.ok) return null
  const json: any = await res.json()
  if (!json.content) return { data: {}, sha: '' }
  return {
    data: JSON.parse(decodeURIComponent(escape(atob(json.content)))),
    sha: json.sha,
  }
}

async function writeLikes(
  token: string,
  data: LikesData,
  sha: string,
): Promise<boolean> {
  const content = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))))
  const url = `${GH_API}/repos/${OWNER}/${REPO}/contents/${encodeURIComponent(LIKES_PATH)}`
  const body: any = {
    message: 'chore(likes): update like counts',
    content,
    branch: BRANCH,
  }
  if (sha) body.sha = sha

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  return res.ok
}

// GET /api/likes?slug=xxx
export async function GET({ request }: { request: Request }) {
  const url = new URL(request.url)
  const slug = url.searchParams.get('slug') || ''

  try {
    const data = await readLikesFromRaw()
    const count = slug ? (data[slug]?.count || 0) : 0

    return new Response(JSON.stringify({ slug, count }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=15, s-maxage=30',
      },
    })
  } catch {
    return new Response(JSON.stringify({ slug, count: 0 }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

// POST /api/likes
// Body: { slug: string, action: 'like' | 'unlike' }
export async function POST({ request, locals }: { request: Request; locals: any }) {
  // Rate limit by IP
  const ip = (request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for') ||
    'unknown') as string
  if (isRateLimited(ip)) {
    return new Response(JSON.stringify({ error: '请求太频繁，请稍后再试' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let body: { slug?: string; action?: 'like' | 'unlike' }
  try {
    body = await request.json()
  } catch {
    return new Response(JSON.stringify({ error: '无效的请求数据' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { slug, action } = body
  if (!slug || !action || !['like', 'unlike'].includes(action)) {
    return new Response(JSON.stringify({ error: '参数不完整' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Get GitHub token from Cloudflare runtime env
  const token: string | undefined =
    locals?.runtime?.env?.GITHUB_TOKEN ||
    (typeof process !== 'undefined' ? (process.env as any)?.GITHUB_TOKEN : undefined)

  if (!token) {
    return new Response(
      JSON.stringify({
        error: '服务器未配置 GitHub Token。请在 Cloudflare Dashboard 中设置 GITHUB_TOKEN 环境变量',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  }

  // Retry loop for concurrent write conflicts (409)
  const maxRetries = 3
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const result = await readLikesFromApi(token)
    if (!result) {
      return new Response(JSON.stringify({ error: '读取点赞数据失败' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const { data, sha } = result
    if (!data[slug]) data[slug] = { count: 0 }

    if (action === 'like') {
      data[slug].count += 1
    } else {
      data[slug].count = Math.max(0, data[slug].count - 1)
    }

    const ok = await writeLikes(token, data, sha)
    if (ok) {
      return new Response(JSON.stringify({ slug, count: data[slug].count }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
      })
    }

    // If conflict (409), the response would not be ok — retry after a brief delay
    if (attempt < maxRetries - 1) {
      await new Promise((r) => setTimeout(r, 200 * (attempt + 1)))
    }
  }

  return new Response(JSON.stringify({ error: '更新点赞失败，请稍后重试' }), {
    status: 409,
    headers: { 'Content-Type': 'application/json' },
  })
}
