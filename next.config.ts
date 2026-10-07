import type { NextConfig } from "next";
import { execSync } from "node:child_process";

/** A git SHA, abbreviated or full. Anything else (e.g. "local") is never published. */
const SHA = /^[0-9a-f]{7,40}$/;

/**
 * The commit this build was made from: the deploy script's BUILD_COMMIT (the pushed SHA, passed
 * with `vercel deploy --build-env`), then Vercel's git integration, then the local checkout.
 * Empty when none is known: the footer then leaves the commit out instead of linking a placeholder.
 */
function buildCommit(): string {
  for (const value of [process.env.BUILD_COMMIT, process.env.VERCEL_GIT_COMMIT_SHA]) {
    const sha = value?.trim().toLowerCase();
    if (sha && SHA.test(sha)) return sha;
  }
  try {
    const sha = execSync("git rev-parse HEAD", { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
    return SHA.test(sha) ? sha : "";
  } catch {
    return "";
  }
}

const csp = (directives: Record<string, string[]>) =>
  Object.entries(directives)
    .map(([name, sources]) => [name, ...sources].join(" "))
    .join("; ");

/**
 * CSP, enforced part: directives no page needs to break. Every page is prerendered, so there is
 * no per-request nonce, and Next's inline flight scripts and the theme script need 'unsafe-inline'.
 */
const ENFORCED = {
  "object-src": ["'none'"],
  "base-uri": ["'self'"],
  "frame-ancestors": ["'none'"],
  "form-action": ["'self'"],
};

/**
 * CSP, report-only part: the full origin inventory. Everything is same-origin, including Vercel
 * Web Analytics and Speed Insights (scripts and intake under first-party paths). frame-ancestors
 * is enforced above (browsers ignore it in a report-only policy). Dev adds 'unsafe-eval' for
 * React's dev tooling.
 */
const REPORT_ONLY = {
  "default-src": ["'self'"],
  "script-src": ["'self'", "'unsafe-inline'", ...(process.env.NODE_ENV === "development" ? ["'unsafe-eval'"] : [])],
  "style-src": ["'self'", "'unsafe-inline'"],
  "img-src": ["'self'"],
  "font-src": ["'self'"],
  "connect-src": ["'self'"],
  "worker-src": ["'self'"],
  "manifest-src": ["'self'"],
  "media-src": ["'self'"],
  "frame-src": ["'none'"],
  "object-src": ["'none'"],
  "base-uri": ["'self'"],
  "form-action": ["'self'"],
};

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Content-Security-Policy", value: csp(ENFORCED) },
  { key: "Content-Security-Policy-Report-Only", value: csp(REPORT_ONLY) },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: { globalNotFound: true },
  env: {
    NEXT_PUBLIC_BUILD_COMMIT: buildCommit(),
    NEXT_PUBLIC_BUILD_DATE: new Date().toISOString(),
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Lab (preview branch wow/lab only): the speak-to-it prototype needs the microphone on
      // /lab/play. A later rule with the same key wins.
      {
        source: "/:lang(th)?/lab/play",
        headers: [
          { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=(), interest-cohort=()" },
        ],
      },
    ];
  },
  async redirects() {
    return [
      // English is canonical without a prefix.
      { source: "/en", destination: "/", permanent: true },
      { source: "/en/:path*", destination: "/:path*", permanent: true },
      // Legacy routes from the old site.
      {
        source: "/:old(cars|lifestyle|games|dashboard|login|register|about|projects|contact)",
        destination: "/",
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return {
      beforeFiles: [],
      // Runs after public files and static routes, before dynamic routes:
      // every path that is not already Thai is served by the English tree.
      afterFiles: [
        { source: "/", destination: "/en" },
        // On Vercel a segment prefetch of "/" is first mapped to /index.segments/...; without this
        // rule the generic one below sent it to /en/index... (404, home fell back to full loads).
        { source: "/index", destination: "/en" },
        { source: "/:path((?!th(?:/|$)|en(?:/|$)|index(?:/|$)|_next/|_vercel/).+)", destination: "/en/:path" },
      ],
      fallback: [],
    };
  },
};

export default nextConfig;
