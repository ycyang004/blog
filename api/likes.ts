const SUPABASE_URL = process.env.SUPABASE_URL?.replace(/\/$/, "");
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

type RpcResult = {
  like_count: number | string;
  liked: boolean;
};

function sendJson(res: any, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

function isValidSlug(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= 200 &&
    !/[\/?#\u0000-\u001f]/.test(value)
  );
}

function isValidVoterId(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{8,128}$/.test(value);
}

async function callRpc<T>(name: string, body: Record<string, string>): Promise<T> {
  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
    throw new Error("Like service is not configured");
  }

  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_SECRET_KEY,
      Authorization: `Bearer ${SUPABASE_SECRET_KEY}`,
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Supabase RPC ${name} failed: ${response.status} ${text}`);
  }

  const data = text ? JSON.parse(text) : null;
  return (Array.isArray(data) ? data[0] : data) as T;
}

export default async function handler(req: any, res: any) {
  if (req.method === "GET") {
    const url = new URL(req.url, `https://${req.headers.host || "localhost"}`);
    const slug = url.searchParams.get("slug");
    const voterId = url.searchParams.get("voter_id") || "";

    if (!isValidSlug(slug)) {
      return sendJson(res, 400, { error: "invalid slug" });
    }

    if (voterId && !isValidVoterId(voterId)) {
      return sendJson(res, 400, { error: "invalid voter id" });
    }

    try {
      const result = await callRpc<RpcResult>("get_blog_like", {
        p_slug: slug,
        p_voter_id: voterId,
      });
      return sendJson(res, 200, {
        slug,
        count: Number(result?.like_count || 0),
        liked: Boolean(result?.liked),
      });
    } catch (error) {
      console.error(error);
      return sendJson(res, 503, { error: "like service unavailable" });
    }
  }

  if (req.method === "POST") {
    try {
      const body =
        typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
      const { slug, voterId, action } = body;

      if (!isValidSlug(slug) || !isValidVoterId(voterId)) {
        return sendJson(res, 400, { error: "invalid request" });
      }

      if (action !== "like" && action !== "unlike") {
        return sendJson(res, 400, { error: "invalid action" });
      }

      const result = await callRpc<RpcResult>("adjust_blog_like", {
        p_slug: slug,
        p_voter_id: voterId,
        p_action: action,
      });

      return sendJson(res, 200, {
        slug,
        count: Number(result?.like_count || 0),
        liked: Boolean(result?.liked),
      });
    } catch (error) {
      console.error(error);
      return sendJson(res, 503, { error: "like service unavailable" });
    }
  }

  res.setHeader("Allow", "GET, POST");
  return sendJson(res, 405, { error: "method not allowed" });
}
