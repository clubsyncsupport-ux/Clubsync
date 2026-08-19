// Railway (and virtually every real host) puts the app behind a reverse
// proxy that terminates the real public HTTPS request and forwards it
// internally over plain HTTP — so `request.url`'s own origin reflects that
// internal address (e.g. http://localhost:8080), not what the browser
// actually connected to. The proxy sets the standard `X-Forwarded-*`
// headers with the real origin; this falls back to the request's own
// origin when those aren't present, which is exactly the case in local dev
// (no proxy in front of `next dev`).
export function getRequestOrigin(request: Request): string {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");
  if (forwardedHost) {
    return `${forwardedProto ?? "https"}://${forwardedHost}`;
  }
  return new URL(request.url).origin;
}
