import { Heart, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";

const VOTER_STORAGE_KEY = "ryuchan-like-voter-id";

type LikeState = {
  count: number;
  liked: boolean;
  loading: boolean;
  pending: boolean;
  unavailable: boolean;
};

function getVoterId() {
  try {
    const stored = window.localStorage.getItem(VOTER_STORAGE_KEY);
    if (stored) return stored;

    const voterId = crypto.randomUUID().replace(/-/g, "");
    window.localStorage.setItem(VOTER_STORAGE_KEY, voterId);
    return voterId;
  } catch {
    return `session-${Date.now().toString(36)}`;
  }
}

export default function LikeButton({ slug }: { slug: string }) {
  const [state, setState] = useState<LikeState>({
    count: 0,
    liked: false,
    loading: true,
    pending: false,
    unavailable: false,
  });

  useEffect(() => {
    const controller = new AbortController();
    const voterId = getVoterId();

    fetch(
      `/api/likes?slug=${encodeURIComponent(slug)}&voter_id=${encodeURIComponent(voterId)}`,
      { signal: controller.signal },
    )
      .then(async (response) => {
        if (!response.ok) throw new Error("like service unavailable");
        return response.json();
      })
      .then((data) => {
        setState({
          count: Number(data.count || 0),
          liked: Boolean(data.liked),
          loading: false,
          pending: false,
          unavailable: false,
        });
      })
      .catch((error) => {
        if (error?.name === "AbortError") return;
        setState((current) => ({
          ...current,
          loading: false,
          unavailable: true,
        }));
      });

    return () => controller.abort();
  }, [slug]);

  const toggleLike = async () => {
    if (state.loading || state.pending || state.unavailable) return;

    const voterId = getVoterId();
    const action = state.liked ? "unlike" : "like";

    setState((current) => ({ ...current, pending: true }));

    try {
      const response = await fetch("/api/likes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, voterId, action }),
      });

      if (!response.ok) throw new Error("like request failed");

      const data = await response.json();
      setState({
        count: Number(data.count || 0),
        liked: Boolean(data.liked),
        loading: false,
        pending: false,
        unavailable: false,
      });
    } catch {
      setState((current) => ({
        ...current,
        pending: false,
        unavailable: true,
      }));
    }
  };

  if (state.unavailable) return null;

  return (
    <button
      type="button"
      className="btn btn-error btn-outline"
      onClick={toggleLike}
      disabled={state.loading || state.pending}
      aria-pressed={state.liked}
      aria-label={state.liked ? "取消点赞" : "点赞"}
    >
      {state.loading || state.pending ? (
        <LoaderCircle className="w-5 h-5 animate-spin" />
      ) : (
        <Heart className="w-5 h-5" fill={state.liked ? "currentColor" : "none"} />
      )}
      <span>{state.liked ? "已点赞" : "点赞"}</span>
      <span className="tabular-nums">{state.loading ? "…" : state.count}</span>
    </button>
  );
}
