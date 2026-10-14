import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: { remotePatterns: [process.env.NEXT_PUBLIC_MEDIA_ORIGIN, process.env.NEXT_PUBLIC_API_BASE_URL].filter(Boolean).map((value) => {
    const url = new URL(value!);
    return { protocol: url.protocol.replace(":", "") as "http" | "https", hostname: url.hostname, port: url.port, pathname: "/media/**" };
  }) },
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
      { key: "Content-Security-Policy", value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'" },
    ] }];
  },
  skipTrailingSlashRedirect: true,
  async rewrites() {
    const backend = new URL(
      process.env.API_INTERNAL_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1",
    ).origin;
    return [
      { source: "/catalog/categories/:path*", destination: `${backend}/api/v1/categories/:path*/` },
      { source: "/management/api/:path*", destination: `${backend}/api/v1/management/:path*/` },
      { source: "/media/:path*", destination: `${backend}/media/:path*` },
      { source: "/management/static/:path*", destination: `${backend}/management/static/:path*` },
    ];
  },
  async redirects() {
    return [{ source: "/backend/django/admin/:path*", destination: "/management/admin/", permanent: false }];
  },
  allowedDevOrigins: ["127.0.0.1"],
  turbopack: {
    rules: {
      "globals.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
