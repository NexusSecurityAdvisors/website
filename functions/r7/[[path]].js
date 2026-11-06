/**
 * /r7/* — first-party relay for PostHog analytics (Cloudflare Pages Function)
 *
 * Routes the PostHog browser SDK through www.nexussecurityadvisors.com so analytics is not
 * silently dropped by ad blockers, and keeps the site's CSP at 'self' for analytics traffic.
 * Based on PostHog's documented Cloudflare Worker proxy:
 * https://posthog.com/docs/advanced/proxy/cloudflare
 *
 *   /r7/static/*, /r7/array/*  -> us-assets.i.posthog.com (SDK scripts, cached at the edge)
 *   /r7/*                      -> us.i.posthog.com (events, replay chunks, flags, config)
 *
 * Privacy and safety:
 *   - Strips the Cookie header so no site cookies (HubSpot, etc.) reach PostHog.
 *   - Strips Authorization unless it is the public project key (phc_). Personal (phx_) and secret
 *     (phs_) keys never come from the browser SDK, so they are never relayed: this domain must not
 *     become a way to reach PostHog's private API with someone else's key.
 *   - Forwards the visitor IP as X-Forwarded-For so PostHog can derive approximate location;
 *     the project setting "Discard client IP data" drops the raw IP after that lookup.
 *   - Only proxies to the two fixed PostHog hosts; no open-proxy behaviour.
 *
 * Cloudflare setup: the custom WAF rule "Static site: allow only GET/HEAD/OPTIONS" must allow
 * POST to paths starting with /r7/ (see README), or every event POST is blocked.
 */
const API_HOST = "us.i.posthog.com";
const ASSET_HOST = "us-assets.i.posthog.com";
const PREFIX = "/r7";
const ALLOWED_METHODS = new Set(["GET", "HEAD", "POST", "OPTIONS"]);

export async function onRequest(context) {
  const { request } = context;
  if (!ALLOWED_METHODS.has(request.method)) {
    return new Response("Method not allowed", { status: 405 });
  }
  const url = new URL(request.url);
  const path = url.pathname.slice(PREFIX.length) || "/";
  const pathWithSearch = path + url.search;

  if (path.startsWith("/static/") || path.startsWith("/array/")) {
    return retrieveAsset(context, pathWithSearch);
  }
  return forwardRequest(request, pathWithSearch);
}

async function retrieveAsset(context, pathWithSearch) {
  const cache = caches.default;
  let response = await cache.match(context.request);
  if (!response) {
    response = await fetch(`https://${ASSET_HOST}${pathWithSearch}`);
    if (response.ok) context.waitUntil(cache.put(context.request, response.clone()));
  }
  return response;
}

async function forwardRequest(request, pathWithSearch) {
  const headers = new Headers(request.headers);
  headers.delete("cookie");
  if (!/^Bearer phc_[A-Za-z0-9]+$/.test(headers.get("authorization") ?? "")) {
    headers.delete("authorization");
  }
  headers.set("X-Forwarded-For", request.headers.get("CF-Connecting-IP") || "");

  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  return fetch(
    new Request(`https://${API_HOST}${pathWithSearch}`, {
      method: request.method,
      headers,
      body: hasBody ? await request.arrayBuffer() : null,
      redirect: "manual",
    })
  );
}
