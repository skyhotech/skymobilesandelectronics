export type MediaOriginConfig = { apiBaseUrl?: string; mediaOrigin?: string };

export function resolveMediaUrl(
  value: string | null | undefined,
  config: MediaOriginConfig = {},
): string | null {
  if (!value || /[\\\u0000-\u001f]/.test(value) || /%2e|%2f|%5c/i.test(value)) return null;
  if (value.split("/").some((part) => part === "." || part === "..")) return null;
  const api = config.apiBaseUrl ?? process.env.NEXT_PUBLIC_API_BASE_URL;
  const media = config.mediaOrigin ?? process.env.NEXT_PUBLIC_MEDIA_ORIGIN;
  const origin = media || (api ? new URL(api).origin : "");
  let path = value;
  if (/^https?:\/\//.test(path)) {
    let url: URL;
    try {
      url = new URL(path);
    } catch {
      return null;
    }
    const allowed = [origin, api ? new URL(api).origin : ""].filter(Boolean);
    if (!allowed.includes(url.origin) || url.username || url.password || url.search || url.hash)
      return null;
    path = url.pathname;
  }
  if (!path.startsWith("/")) path = `/media/${path}`;
  if (path.split("/").some((part) => part === "." || part === "..") || path.startsWith("//"))
    return null;
  if (path.startsWith("/images/homepage/")) return path;
  if (
    !/^\/media\/(products|brands|categories|banners|other|thumbnails)\/[A-Za-z0-9_./ -]+\.(webp|png|jpe?g|avif)$/i.test(
      path,
    )
  )
    return null;
  return origin ? new URL(path, origin).toString() : path;
}

export async function uploadMedia(file: File, kind: string): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  form.append("kind", kind);
  const csrf =
    document.cookie
      .split("; ")
      .find((cookie) => cookie.startsWith("csrftoken="))
      ?.split("=")[1] || "";
  const endpoint = kind === "categories" ? "category-images/" : "media/upload/";
  const response = await fetch(`/management/api/${endpoint}`, {
    method: "POST",
    credentials: "same-origin",
    headers: { "X-CSRFToken": decodeURIComponent(csrf) },
    body: form,
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(
      Array.isArray(data.file)
        ? data.file.join(" ")
        : data.detail || "Image upload failed. Please try again.",
    );
  if (!resolveMediaUrl(data.image_url)) throw new Error("The API returned an invalid media URL.");
  return data.image_url;
}
