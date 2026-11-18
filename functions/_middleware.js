/**
 * Per-request CSP nonce for HTML responses (Cloudflare Pages middleware)
 *
 * Bot Fight Mode is on for this zone, and on this plan it always runs Cloudflare's JavaScript
 * Detections. That feature injects a small inline <script> into every HTML page. Our CSP allows
 * no inline script, so browsers block it (it was the only thing in enforced-policy CSP reports
 * after reporting was fixed on 2026-11-06) and Cloudflare loses its JavaScript bot signal.
 *
 * Cloudflare's documented fix: put a nonce in the CSP response header. Cloudflare parses the
 * header and adds the same nonce to the scripts it injects. Our own pages need no change: every
 * site script is an external file allowed by 'self'. The nonce is new for every response, so it
 * cannot be reused by injected markup. https://developers.cloudflare.com/bots/get-started/bot-fight-mode/
 *
 * Only script-src gets the nonce. Non-HTML responses (assets, /api, /r7, /csp-report) pass
 * through untouched.
 */
const CSP_HEADERS = ["content-security-policy", "content-security-policy-report-only"];

export async function onRequest(context) {
  const response = await context.next();
  const type = response.headers.get("content-type") || "";
  if (!type.toLowerCase().startsWith("text/html")) return response;
  if (!CSP_HEADERS.some((h) => response.headers.has(h))) return response;

  const nonce = makeNonce();
  const headers = new Headers(response.headers);
  for (const name of CSP_HEADERS) {
    const value = headers.get(name);
    if (value) headers.set(name, addNonce(value, nonce));
  }
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

// Insert 'nonce-…' at the start of the script-src directive (not script-src-elem/-attr).
export function addNonce(policy, nonce) {
  return policy.replace(/(^|;\s*)script-src(\s)/, `$1script-src 'nonce-${nonce}'$2`);
}

function makeNonce() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}
