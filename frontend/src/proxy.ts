import { NextRequest, NextResponse } from "next/server";

// Django remains authoritative: cookie presence alone never grants access.
export async function proxy(request: NextRequest) {
  if (/^\/management\/admin\/login\/?$/.test(request.nextUrl.pathname)) return NextResponse.next();
  const login = () => {
    const url = new URL("/management/admin/login", request.url);
    url.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
    const response = NextResponse.redirect(url);
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  };
  const session = request.cookies.get("sessionid");
  if (!session) return login();
  try {
    const origin = new URL(process.env.API_INTERNAL_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1").origin;
    const result = await fetch(`${origin}/api/v1/management/session/`, {
      headers: { Cookie: `sessionid=${encodeURIComponent(session.value)}` },
      redirect: "error", cache: "no-store", signal: AbortSignal.timeout(5000),
    });
    if (!result.ok) throw new Error("Session service unavailable");
    const data = await result.json();
    if (!data.user || typeof data.user.username !== "string") return login();
    const response = NextResponse.next();
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch {
    return new NextResponse("Unable to verify your session. Please try again shortly.", {
      status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "10" },
    });
  }
}

export const config = { matcher: ["/management/admin/:path*"] };
