import type { NextConfig } from "next";
import path from "path";

// ── URL base path ─────────────────────────────────────────────────────────────
// The application is served under this sub-path on Vercel.
// Browser URL: https://rfp-analyzer-pro.vercel.app/praddeeplambba-sih-connect
// All Next.js internal routing, <Link>, <Image>, and API routes are automatically
// prefixed by the framework. Client-side fetch('/api/...') calls must use the
// NEXT_PUBLIC_BASE_PATH env variable (injected at build time below) so they
// resolve to the correct full path in the browser.
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH_OVERRIDE ?? "/praddeeplambba-sih-connect";

// xlsx (SheetJS) and jspdf both use eval() internally at runtime.
// Without 'unsafe-eval' in script-src those libraries are silently
// blocked by the browser's default CSP, causing export features to fail.
const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // 'unsafe-eval' is required by xlsx / jspdf / html2canvas
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://unpkg.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob:",
      "connect-src 'self' https://generativelanguage.googleapis.com https://unpkg.com",
      "worker-src 'self' blob: https://unpkg.com",
      "object-src 'none'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
    ].join("; "),
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
];

const nextConfig: NextConfig = {
  // ── Browser-visible URL path ──────────────────────────────────────────────
  // Sets the sub-path under which the entire app (pages + assets + API routes)
  // is mounted. Next.js automatically prepends this to every generated href,
  // <Link>, <Image> src, and static asset URL.  API routes are also served at
  // BASE_PATH/api/... — the one explicit fetch('/api/parse-pdf') in parser.ts
  // reads NEXT_PUBLIC_BASE_PATH at runtime to build the correct URL.

  // Expose the base path to client-side code (fetch() calls in parser.ts etc.).
  env: {
    NEXT_PUBLIC_BASE_PATH: BASE_PATH,
  },

  // ── Skip basePath in local dev so http://localhost:3000 works directly ──
  ...(process.env.NODE_ENV === 'development' ? { basePath: '' } : { basePath: BASE_PATH }),

  // Silence the workspace-root warning caused by a parent-directory lockfile
  turbopack: {
    root: path.resolve(__dirname),
  },

  // Allow larger file uploads — applies to both Server Actions and is referenced
  // by the framework-level body parser for all routes.
  experimental: {
    serverActions: {
      bodySizeLimit: "30mb",
    },
  },

  // Strict mode for better React hygiene
  reactStrictMode: true,

  // Apply security headers to every route
  async headers() {
    return [
      {
        // HTML pages: never cache — browser always fetches fresh, picks up new JS chunk URLs
        source: "/((?!_next/static|_next/image|favicon).*)",
        headers: [
          ...securityHeaders,
          { key: "Cache-Control", value: "no-store, must-revalidate" },
        ],
      },
      {
        // Static JS/CSS chunks: immutable (content-hashed filenames)
        source: "/_next/static/(.*)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

export default nextConfig;
