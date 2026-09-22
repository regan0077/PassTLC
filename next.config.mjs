import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const isDev = process.env.NODE_ENV !== "production";

// Next's development bundle is built with eval-based source maps and Fast
// Refresh, so `script-src` must allow 'unsafe-eval' in dev or the browser
// blocks EVERY client script: nothing hydrates, so the header's sign-in
// button never resolves past its placeholder, forms stop submitting, and the
// site looks broken and slow. Dev also needs websockets for HMR.
//
// Production never evals, so the production policy stays strict — the
// relaxation is scoped to dev only and cannot leak into a deployed build.
const scriptSrc = [
  "'self'",
  "'unsafe-inline'",
  isDev ? "'unsafe-eval'" : null,
  "https://www.googletagmanager.com",
].filter(Boolean);

const connectSrc = [
  "'self'",
  "https://www.google-analytics.com",
  "https://www.googletagmanager.com",
  // HMR socket.
  isDev ? "ws:" : null,
  isDev ? "wss:" : null,
].filter(Boolean);

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  // Only meaningful over HTTPS; sending it from a local dev server can pin
  // localhost to HTTPS in the browser and make every later dev session fail.
  ...(isDev
    ? []
    : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]),
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      `script-src ${scriptSrc.join(" ")}`,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https://www.google-analytics.com",
      `connect-src ${connectSrc.join(" ")}`,
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join("; "),
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  // (Next 16 removed the `eslint` config key along with `next lint`; linting
  //  now runs as its own step, so there is nothing to ignore during builds.)
  poweredByHeader: false,
  // The app uses no next/image, so the image optimization endpoint is pure
  // attack surface (see GHSA-2xp9-vwfh-vxw4). Turn it off.
  images: { unoptimized: true },
  // Keep server-only Node packages out of the bundle so they stay plain
  // runtime requires. nodemailer is optional at runtime (see
  // src/lib/mailer.ts) and must not become a build-time hard dependency.
  //
  // This replaces a `webpack:` externals hook. It is deliberately
  // bundler-agnostic: `npm run build` uses webpack (see package.json, and
  // the note there about Turbopack failing on hosts with an older glibc),
  // while `next dev` still uses Turbopack locally. A `webpack:` hook would
  // apply to only one of those; serverExternalPackages applies to both.
  serverExternalPackages: ["nodemailer", "better-sqlite3"],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default withNextIntl(nextConfig);
