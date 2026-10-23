import type { NextConfig } from "next";

const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const apiOrigin = /^https?:\/\//.test(apiBase) ? new URL(apiBase).origin : null;
const internalApiOrigin = process.env.INTERNAL_API_ORIGIN;

const nextConfig: NextConfig = {
  output: "standalone",
  // Django requiere la barra final en /api/; evitar que Next la elimine antes del proxy.
  skipTrailingSlashRedirect: true,
  turbopack: { root: process.cwd() },
  async rewrites() {
    if (!internalApiOrigin) return [];

    return ["api", "admin", "static"].map((route) => ({
      source: `/${route}/:path*`,
      destination: `${internalApiOrigin}/${route}/:path*`,
    }));
  },
  async headers() {
    const scriptPolicy = process.env.NODE_ENV === "development"
      ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
      : "script-src 'self' 'unsafe-inline'";
    const contentSecurityPolicy = [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "img-src 'self' data:",
      "font-src 'self' data:",
      "style-src 'self' 'unsafe-inline'",
      scriptPolicy,
      `connect-src 'self'${apiOrigin ? ` ${apiOrigin}` : ""}`,
    ].join("; ");

    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
