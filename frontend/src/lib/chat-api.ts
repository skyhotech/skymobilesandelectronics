export type Person = { id: number; username: string; name: string };
export type ChatCall = { id: number; conversation: number; caller: number; kind: "audio" | "video"; status: string; created_at: string };
export type Inbox = { me: Person; contacts: Person[]; conversations: { id: number; peer: Person; unread: number }[]; calls: ChatCall[]; latest_message: number };
export type ChatMessage = { id: number; sender_id: number; client_id: string; text: string; filename: string; size: number; attachment_url: string; created_at: string; read_at: string | null };

export async function chatApi<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const csrf = document.cookie.split("; ").find(c => c.startsWith("csrftoken="))?.slice(10) || "";
  const file = body instanceof FormData;
  const response = await fetch(`/chat/api/${path}`, {
    method, credentials: "same-origin", cache: "no-store", signal: AbortSignal.timeout(15000),
    headers: { ...(!file ? { "Content-Type": "application/json" } : {}), ...(method !== "GET" ? { "X-CSRFToken": decodeURIComponent(csrf) } : {}) },
    ...(body === undefined ? {} : { body: file ? body : JSON.stringify(body) }),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.detail || (data ? JSON.stringify(data) : "Chat request failed. Please retry."));
  return data as T;
}
