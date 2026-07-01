import type { NextConfig } from "next";

/**
 * Cabeçalhos de segurança HTTP aplicados a todas as respostas.
 *
 * A CSP é montada estaticamente aqui (não via nonce no middleware) para não
 * arriscar a inicialização de scripts do Next em produção. O app não usa
 * `dangerouslySetInnerHTML`/`innerHTML`/`eval` e o React já escapa a saída,
 * então o `'unsafe-inline'` em `script-src` tem superfície de XSS reduzida.
 *
 * `connect-src` usa wildcard `*.supabase.co` (REST + Realtime via wss) para
 * funcionar em qualquer ambiente sem hardcodar o host do projeto. Em
 * desenvolvimento, liberamos `'unsafe-eval'` e `ws:` para o HMR/Turbopack.
 */

const isDev = process.env.NODE_ENV !== "production";

const scriptSrc = [
  "'self'",
  "'unsafe-inline'",
  isDev ? "'unsafe-eval'" : "",
]
  .filter(Boolean)
  .join(" ");

const connectSrc = [
  "'self'",
  "https://*.supabase.co",
  "wss://*.supabase.co",
  isDev ? "ws://localhost:*" : "",
]
  .filter(Boolean)
  .join(" ");

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src ${scriptSrc}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self'",
  `connect-src ${connectSrc}`,
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
