import { NextResponse } from "next/server";

export function GET() {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";
  return NextResponse.redirect(new URL("/backend/django/admin/", apiBase));
}
