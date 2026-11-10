/**
 * The site may be served on both `example.com` and `www.example.com` (one redirecting to the other).
 * The extension talks to the API on the configured origin only (cross-origin redirects drop the
 * Authorization header), but the connect page / bridge must work on both.
 * Pure function — also used by manifest.config.ts at build time.
 */
export function relatedOrigins(configured: string): string[] {
  const url = new URL(configured);
  const isLocal = url.hostname === "localhost" || /^[\d.]+$/.test(url.hostname);
  if (isLocal) return [url.origin];

  const altHost = url.hostname.startsWith("www.") ? url.hostname.slice(4) : `www.${url.hostname}`;
  const port = url.port ? `:${url.port}` : "";
  return [url.origin, `${url.protocol}//${altHost}${port}`];
}
