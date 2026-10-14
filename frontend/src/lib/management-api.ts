export type Session = { user: { username: string } | null; csrfToken: string };
export type Reference = { id: number; name: string; slug: string; is_active: boolean; parent?: number | null; parent_name?: string };
export type Product = Reference & { sku: string; description: string; brand: number; category: number; price: string; compare_at_price: string | null; currency: string };
export type Page<T> = { count: number; next: string | null; previous: string | null; results: T[] };

export class ManagementError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function managementApi<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const csrf = typeof document === "undefined" ? "" : document.cookie.split("; ").find((cookie) => cookie.startsWith("csrftoken="))?.split("=").slice(1).join("=") || "";
  const response = await fetch(`/management/api/${path}`, {
    method, credentials: "same-origin", cache: "no-store",
    headers: { "Content-Type": "application/json", ...(method !== "GET" ? { "X-CSRFToken": decodeURIComponent(csrf) } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (response.status === 204) return undefined as T;
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = data && typeof data === "object"
      ? Object.entries(data).map(([key, value]) => `${key === "detail" ? "" : `${key}: `}${Array.isArray(value) ? value.join(" ") : typeof value === "object" ? JSON.stringify(value) : String(value)}`).join(" · ")
      : "The server could not complete your request. Please try again.";
    throw new ManagementError(response.status, message);
  }
  return data as T;
}

export async function allReferences(resource: string): Promise<Reference[]> {
  const entries: Reference[] = [];
  let page = 1;
  while (true) {
    const result = await managementApi<Page<Reference>>(`${resource}/?page=${page}`);
    entries.push(...result.results);
    if (!result.next) return entries;
    page += 1;
  }
}
