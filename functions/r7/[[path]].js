/**
 * /r7/* — first-party relay for PostHog analytics (Cloudflare Pages Function)
 *
 * Routes the PostHog browser SDK through www.nexussecurityadvisors.com so analytics is not
 * silently dropped by ad blockers, and keeps the site's CSP at 'self' for analytics traffic.
 * Based on PostHog's documented Cloudflare proxy: https://posthog.com/docs/advanced/proxy/cloudflare
 *
 *   /r7/static/*, /r7/array/*  -> us-assets.i.posthog.com (GET only, cached at the edge)
 *   /r7/<allowlisted path>     -> us.i.posthog.com (events, replay, flags, surveys)
 *
 * Hardening (Nov 2026 WAF review):
 *   - Path allowlist: only the endpoints the browser SDK uses are relayed; everything else 404s.
 *     The relay must not front the rest of PostHog's API for arbitrary callers.
 *   - Rejects traversal and encoded characters in the path (.., \, %).
 *   - Rebuilds request headers from an allowlist. Cookie, Authorization (including phx_
 *     personal API keys), and all hop-by-hop headers are never forwarded.
 *   - Caps request bodies at MAX_BODY_BYTES.
 *   - Strips Set-Cookie from upstream responses.
 *   - Forwards the visitor IP as X-Forwarded-For so PostHog can derive approximate location;
 *     the project setting "Discard client IP data" drops the raw IP after that lookup.
 *
 * Cloudflare setup (already in place on the zone):
 *   - Custom rule 1 "Static site: allow only GET/HEAD/OPTIONS" exempts POST to www /r7/*.
 *   - Custom rule "PostHog relay /r7/: require same-origin POST, no traversal" blocks /r7/ POSTs
 *     without Origin https://www.nexussecurityadvisors.com, with traversal/encoded slashes, or
 *     with Content-Length of 10 MB or more.
 */
const API_HOST = "us.i.posthog.com";
const ASSET_HOST = "us-assets.i.posthog.com";
const PREFIX = "/r7";
const MAX_BODY_BYTES = 2 * 1024 * 1024; // replay chunks are compressed; 2 MB is generous

// Endpoints posthog-js calls. VERIFY against the SDK's network traffic on a preview deploy
// before merging: PostHog adds endpoints over time, and a missing one fails silently (404).
const ASSET_PREFIXES = ["/static/", "/array/"];
const API_ROUTES = [
  "/e", "/i/", "/batch", "/s", "/flags", "/decide", "/engage", "/capture", "/track",
  "/api/surveys", "/api/early_access_features", "/api/web_experiments",
];

const FORWARD_HEADERS = ["content-type", "content-encoding", "accept", "accept-language", "user-agent"];

function routeAllowed(path) {
  return API_ROUTES.some((r) =>
    r.endsWith("/") ? path.startsWith(r) : path === r || path.startsWith(r + "/")
  );
}

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const rawPath = url.pathname.slice(PREFIX.length) || "/";

  if (rawPath.includes("..") || rawPath.includes("\\") || rawPath.includes("%")) {
    return new Response("Bad request", { status: 400 });
  }
  const pathWithSearch = rawPath + url.search;

  if (ASSET_PREFIXES.some((p) => rawPath.startsWith(p))) {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method not allowed", { status: 405, headers: { Allow: "GET, HEAD" } });
    }
    return retrieveAsset(context, pathWithSearch);
  }

  if (!routeAllowed(rawPath)) {
    return new Response("Not found", { status: 404 });
  }
  if (!["GET", "POST", "OPTIONS"].includes(request.method)) {
    return new Response("Method not allowed", { status: 405, headers: { Allow: "GET, POST, OPTIONS" } });
  }
  return forwardRequest(request, pathWithSearch);
}

async function retrieveAsset(context, pathWithSearch) {
  const cache = caches.default;
  let response = await cache.match(context.request);
  if (!response) {
    const upstream = await fetch(`https://${ASSET_HOST}${pathWithSearch}`);
    // Copy so headers are mutable; drop Set-Cookie so no upstream cookie reaches visitors or the edge cache.
    response = new Response(upstream.body, upstream);
    response.headers.delete("set-cookie");
    if (response.ok) context.waitUntil(cache.put(context.request, response.clone()));
  }
  return response;
}

async function forwardRequest(request, pathWithSearch) {
  const headers = new Headers();
  for (const name of FORWARD_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  headers.set("X-Forwarded-For", request.headers.get("CF-Connecting-IP") || "");

  let body = null;
  if (request.method === "POST") {
    const declared = Number(request.headers.get("content-length") || 0);
    if (declared > MAX_BODY_BYTES) return new Response("Payload too large", { status: 413 });
    body = await request.arrayBuffer();
    if (body.byteLength > MAX_BODY_BYTES) return new Response("Payload too large", { status: 413 });
  }

  const upstream = await fetch(
    new Request(`https://${API_HOST}${pathWithSearch}`, {
      method: request.method,
      headers,
      body,
      redirect: "manual",
    })
  );

  const response = new Response(upstream.body, upstream);
  response.headers.delete("set-cookie");
  return response;
}
