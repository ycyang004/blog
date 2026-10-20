import {
  LoaderCircle,
  LogIn,
  LogOut,
  MessageCircle,
  Send,
  Trash2,
  UserPlus,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";

const SUPABASE_URL = (
  import.meta.env.PUBLIC_SUPABASE_URL ||
  "https://yixsdglscytkwoomupvs.supabase.co"
).replace(/\/$/, "");
const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_5ENE2nwM4IJ3yZ3cWXzwiw_TTp__5FX";
const SESSION_STORAGE_KEY = "ryuchan-supabase-comment-session";
const ALLOWED_EMAIL_PATTERN = /^[^\s@]+@(?:qq\.com|gmail\.com)$/i;
const MAX_COMMENT_LENGTH = 2000;

type AuthMode = "login" | "register";

type SupabaseUser = {
  id: string;
  email?: string;
  user_metadata?: {
    display_name?: string;
    name?: string;
  };
};

type SupabaseSession = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: SupabaseUser;
};

type BlogComment = {
  id: string;
  user_id: string;
  author_name: string;
  content: string;
  created_at: string;
};

type Notice = {
  type: "error" | "success" | "info";
  message: string;
} | null;

function normalizeSession(data: {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
  expires_at?: number;
  user: SupabaseUser;
}): SupabaseSession {
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at:
      typeof data.expires_at === "number"
        ? data.expires_at * 1000
        : Date.now() + Number(data.expires_in || 3600) * 1000,
    user: data.user,
  };
}

function readStoredSession(): SupabaseSession | null {
  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as SupabaseSession;
    if (
      typeof parsed.access_token !== "string" ||
      typeof parsed.refresh_token !== "string" ||
      typeof parsed.user?.id !== "string"
    ) {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function storeSession(session: SupabaseSession | null) {
  try {
    if (session) {
      window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    } else {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  } catch {
    // A blocked localStorage should not prevent a signed-in user from commenting.
  }
}

function displayNameFor(user: SupabaseUser) {
  const metadataName =
    user.user_metadata?.display_name?.trim() ||
    user.user_metadata?.name?.trim() ||
    "";

  if (metadataName) return metadataName;
  return user.email?.split("@")[0]?.trim() || "博客读者";
}

async function readResponse(response: Response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

function responseError(data: any, fallback: string) {
  const message =
    data?.msg ||
    data?.message ||
    data?.error_description ||
    data?.error ||
    fallback;
  const normalized = String(message).toLowerCase();

  if (normalized.includes("invalid login credentials")) {
    return "邮箱或密码错误。";
  }
  if (normalized.includes("email not confirmed")) {
    return "邮箱尚未验证，请先查收验证邮件。";
  }
  if (normalized.includes("user already registered")) {
    return "该邮箱已经注册，请直接登录。";
  }
  if (normalized.includes("database error saving new user")) {
    return "注册失败，请确认邮箱是 @qq.com 或 @gmail.com。";
  }

  return message;
}

async function supabaseRequest(
  path: string,
  options: RequestInit = {},
  accessToken?: string,
) {
  const headers = new Headers(options.headers);
  headers.set("apikey", SUPABASE_PUBLISHABLE_KEY);

  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const response = await fetch(`${SUPABASE_URL}${path}`, {
    ...options,
    headers,
  });
  const data = await readResponse(response);

  if (!response.ok) {
    throw new Error(responseError(data, `请求失败 (${response.status})`));
  }

  return data;
}

async function refreshSession(
  refreshToken: string,
): Promise<SupabaseSession> {
  const data = await supabaseRequest(
    "/auth/v1/token?grant_type=refresh_token",
    {
      method: "POST",
      body: JSON.stringify({ refresh_token: refreshToken }),
    },
  );

  return normalizeSession(data);
}

function formatCommentTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function noticeClass(type: NonNullable<Notice>["type"]) {
  if (type === "error") return "alert-error";
  if (type === "success") return "alert-success";
  return "alert-info";
}

export default function SupabaseComments({ slug }: { slug: string }) {
  const [comments, setComments] = useState<BlogComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [session, setSession] = useState<SupabaseSession | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [content, setContent] = useState("");
  const [authPending, setAuthPending] = useState(false);
  const [commentPending, setCommentPending] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  const loadComments = async () => {
    setCommentsLoading(true);

    try {
      const query = new URLSearchParams({
        post_slug: `eq.${slug}`,
        select: "id,user_id,author_name,content,created_at",
        order: "created_at.asc",
      });
      const data = await supabaseRequest(
        `/rest/v1/blog_comments?${query.toString()}`,
      );
      setComments(Array.isArray(data) ? data : []);
    } catch (error) {
      setNotice({
        type: "error",
        message:
          error instanceof Error
            ? `评论加载失败：${error.message}`
            : "评论加载失败，请稍后再试。",
      });
    } finally {
      setCommentsLoading(false);
    }
  };

  useEffect(() => {
    void loadComments();

    const stored = readStoredSession();
    if (!stored) return;

    if (stored.expires_at > Date.now() + 60_000) {
      setSession(stored);
      return;
    }

    refreshSession(stored.refresh_token)
      .then((refreshed) => {
        storeSession(refreshed);
        setSession(refreshed);
      })
      .catch(() => {
        storeSession(null);
        setSession(null);
      });
  }, [slug]);

  const getFreshSession = async () => {
    const current = session || readStoredSession();
    if (!current) throw new Error("请先登录后再发表评论");

    if (current.expires_at > Date.now() + 60_000) {
      return current;
    }

    const refreshed = await refreshSession(current.refresh_token);
    storeSession(refreshed);
    setSession(refreshed);
    return refreshed;
  };

  const changeAuthMode = (mode: AuthMode) => {
    setAuthMode(mode);
    setNotice(null);
  };

  const handleAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();
    if (!ALLOWED_EMAIL_PATTERN.test(normalizedEmail)) {
      setNotice({
        type: "error",
        message: "只允许使用 @qq.com 或 @gmail.com 邮箱注册和登录。",
      });
      return;
    }

    if (password.length < 6) {
      setNotice({ type: "error", message: "密码至少需要 6 位。" });
      return;
    }

    if (authMode === "register") {
      if (nickname.trim().length < 2 || nickname.trim().length > 24) {
        setNotice({
          type: "error",
          message: "昵称需要 2 到 24 个字符。",
        });
        return;
      }

      if (password !== confirmPassword) {
        setNotice({ type: "error", message: "两次输入的密码不一致。" });
        return;
      }
    }

    setAuthPending(true);
    setNotice(null);

    try {
      if (authMode === "login") {
        const data = await supabaseRequest(
          "/auth/v1/token?grant_type=password",
          {
            method: "POST",
            body: JSON.stringify({
              email: normalizedEmail,
              password,
            }),
          },
        );
        const nextSession = normalizeSession(data);
        storeSession(nextSession);
        setSession(nextSession);
        setPassword("");
        setNotice({ type: "success", message: "登录成功，现在可以发表评论了。" });
        return;
      }

      const data = await supabaseRequest("/auth/v1/signup", {
        method: "POST",
        body: JSON.stringify({
          email: normalizedEmail,
          password,
          data: { display_name: nickname.trim() },
        }),
      });

      setPassword("");
      setConfirmPassword("");

      if (data?.access_token && data?.refresh_token) {
        const nextSession = normalizeSession(data);
        storeSession(nextSession);
        setSession(nextSession);
        setNotice({
          type: "success",
          message: "注册成功，现在可以发表评论了。",
        });
      } else {
        setAuthMode("login");
        setNotice({
          type: "success",
          message: "注册成功，请先前往邮箱完成验证，再回来登录。",
        });
      }
    } catch (error) {
      setNotice({
        type: "error",
        message:
          error instanceof Error ? error.message : "操作失败，请稍后再试。",
      });
    } finally {
      setAuthPending(false);
    }
  };

  const handleLogout = async () => {
    const current = session || readStoredSession();
    storeSession(null);
    setSession(null);
    setNotice({ type: "info", message: "已退出登录。" });

    if (current?.access_token) {
      void supabaseRequest(
        "/auth/v1/logout",
        { method: "POST" },
        current.access_token,
      ).catch(() => undefined);
    }
  };

  const handleComment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = content.trim();

    if (!trimmed) {
      setNotice({ type: "error", message: "评论内容不能为空。" });
      return;
    }

    if (trimmed.length > MAX_COMMENT_LENGTH) {
      setNotice({
        type: "error",
        message: `评论不能超过 ${MAX_COMMENT_LENGTH} 个字符。`,
      });
      return;
    }

    setCommentPending(true);
    setNotice(null);

    try {
      const current = await getFreshSession();
      await supabaseRequest(
        "/rest/v1/blog_comments",
        {
          method: "POST",
          headers: { Prefer: "return=minimal" },
          body: JSON.stringify({
            post_slug: slug,
            user_id: current.user.id,
            author_name: displayNameFor(current.user),
            content: trimmed,
          }),
        },
        current.access_token,
      );
      setContent("");
      setNotice({ type: "success", message: "评论已发布。" });
      await loadComments();
    } catch (error) {
      setNotice({
        type: "error",
        message:
          error instanceof Error ? error.message : "评论发布失败，请稍后再试。",
      });
    } finally {
      setCommentPending(false);
    }
  };

  const deleteComment = async (comment: BlogComment) => {
    try {
      const current = await getFreshSession();
      await supabaseRequest(
        `/rest/v1/blog_comments?id=eq.${encodeURIComponent(comment.id)}`,
        {
          method: "DELETE",
          headers: { Prefer: "return=minimal" },
        },
        current.access_token,
      );
      setComments((items) => items.filter((item) => item.id !== comment.id));
      setNotice({ type: "success", message: "评论已删除。" });
    } catch (error) {
      setNotice({
        type: "error",
        message:
          error instanceof Error ? error.message : "删除失败，请稍后再试。",
      });
    }
  };

  return (
    <div className="mt-8 rounded-3xl border border-base-200 bg-base-100/90 p-5 shadow-xl md:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-2xl font-bold text-base-content">
          <MessageCircle className="h-6 w-6 text-primary" />
          评论区
          <span className="badge badge-primary badge-sm">
            {commentsLoading ? "…" : comments.length}
          </span>
        </h2>
        <p className="text-sm text-base-content/60">
          游客可浏览，登录后即可参与讨论
        </p>
      </div>

      {notice && (
        <div
          className={`alert ${noticeClass(notice.type)} mb-5 text-sm`}
          role="status"
        >
          <span>{notice.message}</span>
        </div>
      )}

      <div className="space-y-3" aria-live="polite">
        {commentsLoading &&
          [1, 2].map((item) => (
            <div
              className="rounded-2xl border border-base-200 bg-base-200/40 p-4"
              key={item}
            >
              <div className="skeleton mb-3 h-4 w-32" />
              <div className="skeleton h-4 w-full" />
            </div>
          ))}

        {!commentsLoading && comments.length === 0 && (
          <div className="rounded-2xl border border-dashed border-base-300 bg-base-200/30 px-5 py-10 text-center text-base-content/60">
            还没有评论，来留下第一句话吧。
          </div>
        )}

        {!commentsLoading &&
          comments.map((comment) => (
            <article
              className="rounded-2xl border border-base-200 bg-base-100 p-4 shadow-sm transition hover:border-primary/30 hover:shadow-md"
              key={comment.id}
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary font-bold text-primary-content shadow-lg">
                  {comment.author_name.slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="font-semibold text-base-content">
                        {comment.author_name}
                      </span>
                      <time className="text-xs text-base-content/50">
                        {formatCommentTime(comment.created_at)}
                      </time>
                    </div>
                    {session?.user.id === comment.user_id && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs text-error"
                        onClick={() => void deleteComment(comment)}
                        aria-label="删除我的评论"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        删除
                      </button>
                    )}
                  </div>
                  <p className="mt-2 whitespace-pre-wrap break-words leading-7 text-base-content/85">
                    {comment.content}
                  </p>
                </div>
              </div>
            </article>
          ))}
      </div>

      <div className="mt-7 border-t border-base-200 pt-6">
        {session ? (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-primary/10 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary font-bold text-primary-content">
                {displayNameFor(session.user).slice(0, 1).toUpperCase()}
              </div>
              <div>
                <div className="font-semibold text-base-content">
                  {displayNameFor(session.user)}
                </div>
                <div className="text-xs text-base-content/55">已登录</div>
              </div>
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => void handleLogout()}
            >
              <LogOut className="h-4 w-4" />
              退出
            </button>
          </div>
        ) : (
          <div className="mb-5 rounded-2xl border border-base-200 bg-base-200/35 p-4 md:p-5">
            <div className="tabs-boxed tabs mb-5 grid grid-cols-2">
              <button
                type="button"
                className={`tab ${authMode === "login" ? "tab-active" : ""}`}
                onClick={() => changeAuthMode("login")}
              >
                登录
              </button>
              <button
                type="button"
                className={`tab ${authMode === "register" ? "tab-active" : ""}`}
                onClick={() => changeAuthMode("register")}
              >
                注册
              </button>
            </div>

            <form className="space-y-3" onSubmit={handleAuth}>
              {authMode === "register" && (
                <label className="form-control w-full">
                  <span className="label-text mb-1 font-medium">昵称</span>
                  <input
                    className="input input-bordered w-full bg-base-100"
                    value={nickname}
                    onChange={(event) => setNickname(event.target.value)}
                    minLength={2}
                    maxLength={24}
                    placeholder="评论区显示的名字"
                    autoComplete="nickname"
                    required
                  />
                </label>
              )}

              <label className="form-control w-full">
                <span className="label-text mb-1 font-medium">邮箱</span>
                <input
                  type="email"
                  className="input input-bordered w-full bg-base-100"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@qq.com 或 name@gmail.com"
                  autoComplete="email"
                  required
                />
                <span className="mt-1 text-xs text-base-content/50">
                  仅支持 QQ 邮箱和 Gmail 邮箱
                </span>
              </label>

              <div
                className={
                  authMode === "register"
                    ? "grid gap-3 md:grid-cols-2"
                    : "grid gap-3"
                }
              >
                <label className="form-control w-full">
                  <span className="label-text mb-1 font-medium">密码</span>
                  <input
                    type="password"
                    className="input input-bordered w-full bg-base-100"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    minLength={6}
                    placeholder="至少 6 位"
                    autoComplete={
                      authMode === "register"
                        ? "new-password"
                        : "current-password"
                    }
                    required
                  />
                </label>

                {authMode === "register" && (
                  <label className="form-control w-full">
                    <span className="label-text mb-1 font-medium">
                      确认密码
                    </span>
                    <input
                      type="password"
                      className="input input-bordered w-full bg-base-100"
                      value={confirmPassword}
                      onChange={(event) =>
                        setConfirmPassword(event.target.value)
                      }
                      minLength={6}
                      placeholder="再次输入密码"
                      autoComplete="new-password"
                      required
                    />
                  </label>
                )}
              </div>

              <button
                type="submit"
                className="btn btn-primary w-full md:w-auto"
                disabled={authPending}
              >
                {authPending ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : authMode === "login" ? (
                  <LogIn className="h-4 w-4" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
                {authMode === "login" ? "登录" : "注册"}
              </button>
            </form>
          </div>
        )}

        <form onSubmit={handleComment}>
          <label className="mb-2 block font-semibold text-base-content">
            {session ? "写下你的评论" : "登录后参与评论"}
          </label>
          <textarea
            className="textarea textarea-bordered min-h-32 w-full resize-y bg-base-100 leading-7"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            maxLength={MAX_COMMENT_LENGTH}
            placeholder={
              session ? "友善交流，让每一次讨论都有价值…" : "请先登录后再评论"
            }
            disabled={!session || commentPending}
          />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-base-content/50">
              {content.length} / {MAX_COMMENT_LENGTH}
            </span>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!session || commentPending || !content.trim()}
            >
              {commentPending ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              发表评论
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
