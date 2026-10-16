export function isManagementPage(path: string): boolean {
  return path === "/management/admin" || path.startsWith("/management/admin/");
}

export function safeManagementReturn(value: string | null): string {
  if (!value || /[\\\r\n]/.test(value)) return "/management/admin";
  try {
    const url = new URL(value, "https://internal.invalid");
    if (
      url.origin === "https://internal.invalid" &&
      isManagementPage(url.pathname) &&
      !/^\/management\/admin\/login\/?$/.test(url.pathname)
    ) {
      return url.pathname + url.search;
    }
  } catch {
    /* Invalid return paths fall back to the dashboard. */
  }
  return "/management/admin";
}

export function safeHRReturn(value: string | null): string {
  if (!value || /[\\\r\n]/.test(value)) return "/hr";
  try {
    const url = new URL(value, "https://internal.invalid");
    if (url.origin === "https://internal.invalid" && ["/hr", "/hr/employees"].includes(url.pathname))
      return url.pathname + url.search;
  } catch { /* Invalid destinations return to the HR workspace. */ }
  return "/hr";
}
