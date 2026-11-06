/**
 * POST /api/intake — /get-started consultation request (Cloudflare Pages Function)
 *
 * Replaces the browser posting straight to Zoho Web-to-Lead. Flow:
 *   origin + size checks -> field allowlist and validation -> honeypot / minimum fill time
 *   -> Turnstile siteverify (action "intake") -> KV rate limits -> server-side Zoho Web-to-Lead.
 *
 * The browser builds the same Zoho field map it always has (see site/js/getstarted-*.js);
 * this function only forwards allowlisted fields and adds the Zoho form tokens itself.
 *
 * Secrets / bindings (Cloudflare Pages > Settings), shared with /api/readiness:
 *   TURNSTILE_SECRET    secret for the existing Turnstile widget (required).
 *   RL                  KV namespace for rate limits (fails open if missing).
 *   ZOHO_XNQ, ZOHO_XMI  optional overrides for the Web-to-Lead form tokens.
 *   TURNSTILE_HOSTNAMES optional, comma-separated production hostnames.
 *   LEAD_SINK           set to "off" only for local testing (skips the Zoho POST).
 *   ALLOWED_ORIGINS     optional, comma-separated; defaults to the production hostnames.
 */
const MAX_BODY = 48 * 1024;
const LIMITS = { ipPerHour: 5, emailPerDay: 3 };
const DEFAULT_ORIGINS = ["https://www.nexussecurityadvisors.com", "https://nexussecurityadvisors.com"];
const ZOHO_URL = "https://crm.zoho.com/crm/WebToLeadForm";
const ZOHO_DEFAULTS = {
  xnQsjsdp: "26b3ed224959eed21ff859b2a27cafa0d48f0956b8c076ea103a1426f52ecb13",
  xmIwtLD: "81b32ded400032379d48d3c5a8d6689e97cebacbd3fa5615348025ea152850642c388991f70c0f9840f72fa50c75a555",
};
// Zoho field -> max length. Only these keys are forwarded. Arrays allowed only where marked.
const FIELDS = {
  "First Name": 40, "Last Name": 80, Email: 100, Company: 200, Designation: 100, Phone: 30, Website: 255,
  LEADCF6: 30000, LEADCF7: 40, Industry: 80, LEADCF8: 80, LEADCF9: 80, LEADCF10: 80, LEADCF11: 120,
  LEADCF12: 80, LEADCF3: 100, LEADCF4: 100, LEADCF5: 100,
};
const MULTI = { LEADCF2: 120, LEADCF1: 120 }; // services, frameworks (multi-select picklists)

const json = (body, status = 200, extra = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...extra },
  });

export const onRequest = () => json({ error: "method_not_allowed" }, 405, { allow: "POST" });

export async function onRequestPost(context) {
  const { request, env } = context;

  // ---- 1. transport checks
  const origin = request.headers.get("origin") || "";
  const allowed = env.ALLOWED_ORIGINS ? env.ALLOWED_ORIGINS.split(",").map((s) => s.trim()) : DEFAULT_ORIGINS;
  const self = new URL(request.url).origin;
  if (origin !== self && !allowed.includes(origin)) return json({ error: "forbidden" }, 403);
  if (!(request.headers.get("content-type") || "").includes("application/json")) return json({ error: "bad_request" }, 415);
  const raw = await request.text();
  if (raw.length > MAX_BODY) return json({ error: "too_large" }, 413);
  let body;
  try { body = JSON.parse(raw); } catch { return json({ error: "bad_request" }, 400); }

  // ---- 2. allowlist + validate
  const src = body && typeof body.fields === "object" && body.fields ? body.fields : {};
  const clean = (v, max, multiline) => {
    let s = String(v ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "");
    if (!multiline) s = s.replace(/\s+/g, " ");
    s = s.trim().slice(0, max);
    return /^[=+\-@]/.test(s) ? "'" + s : s; // formula-injection guard for CRM exports
  };
  // Phone: keep only phone characters instead of quoting, so "+1 352 555 0100" stays a dialable
  // E.164 number in Zoho. Without letters or "=", no formula payload can survive.
  const cleanPhone = (v, max) => String(v ?? "").replace(/[^0-9+()\-. x]/gi, "").replace(/\s+/g, " ").trim().slice(0, max);
  const fields = {};
  for (const [k, max] of Object.entries(FIELDS)) {
    if (typeof src[k] !== "string" || !src[k].trim()) continue;
    const v = k === "Phone" ? cleanPhone(src[k], max) : clean(src[k], max, k === "LEADCF6");
    if (v) fields[k] = v;
  }
  for (const [k, max] of Object.entries(MULTI)) {
    const v = Array.isArray(src[k]) ? src[k] : typeof src[k] === "string" ? [src[k]] : [];
    const vals = v.filter((x) => typeof x === "string" && x.trim()).slice(0, 12).map((x) => clean(x, max));
    if (vals.length) fields[k] = vals;
  }
  fields.Email = (fields.Email || "").toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(fields.Email)) return json({ error: "invalid", field: "email" }, 400);
  if (!fields["Last Name"] || !fields.Company) return json({ error: "invalid", field: "contact" }, 400);
  if (body.consent !== true) return json({ error: "invalid", field: "consent" }, 400);

  // ---- 3. anti-bot: honeypot + minimum fill time. Pretend success so bots learn nothing.
  // Turnstile (3b) is the real gate; the timer only catches instant scripted posts. Keep it low:
  // a prospect who autofills a short form can finish in a few seconds, and a false positive here
  // silently drops a real lead. Logged so any drops are visible.
  const MIN_FILL_MS = 3000;
  if (body.hp || !(Number(body.elapsed) > MIN_FILL_MS)) {
    console.log("intake_silent_drop", body.hp ? "honeypot" : `fast_${Math.round(Number(body.elapsed) || 0)}ms`);
    return json({ ok: true });
  }

  // ---- 3b. Turnstile: server-side siteverify gates the CRM lead.
  if (!(await verifyTurnstile(env, body["cf-turnstile-response"], request.headers.get("cf-connecting-ip")))) {
    return json({ error: "verification_failed", message: "We couldn't verify this request. Please complete the security check and try again." }, 403);
  }

  // ---- 4. rate limits (KV). Fail open if the binding is missing so real leads are never lost.
  if (env.RL) {
    const ip = request.headers.get("cf-connecting-ip") || "0.0.0.0";
    const hour = new Date().toISOString().slice(0, 13);
    const day = new Date().toISOString().slice(0, 10);
    const [ipN, emN] = await Promise.all([
      bump(env.RL, `rl:intake:ip:${await sha(ip)}:${hour}`, 3700),
      bump(env.RL, `rl:intake:em:${await sha(fields.Email)}:${day}`, 90000),
    ]);
    if (ipN > LIMITS.ipPerHour || emN > LIMITS.emailPerDay) {
      return json({ error: "rate_limited", message: "We've already received a few requests from you. We'll be in touch, or email info@nexussecurityadvisors.com." }, 429, { "retry-after": "3600" });
    }
  }

  // ---- 5. lead to Zoho CRM. Awaited: the visitor should only see "sent" if Zoho accepted it.
  try {
    await sendLead(env, fields);
  } catch (e) {
    console.log("zoho_error", String(e && e.message));
    return json({ error: "upstream", message: "Something went wrong sending your request. Please try again, or email it to info@nexussecurityadvisors.com." }, 502);
  }
  return json({ ok: true });
}

async function sendLead(env, fields) {
  if (env.LEAD_SINK === "off") { console.log("lead_sink_off"); return; } // local testing only
  const f = new URLSearchParams();
  f.append("xnQsjsdp", env.ZOHO_XNQ || ZOHO_DEFAULTS.xnQsjsdp);
  f.append("xmIwtLD", env.ZOHO_XMI || ZOHO_DEFAULTS.xmIwtLD);
  f.append("actionType", "TGVhZHM=");
  f.append("returnURL", "https://www.nexussecurityadvisors.com/get-started?submitted=1");
  for (const [k, v] of Object.entries(fields)) [].concat(v).forEach((x) => f.append(k, x));
  f.append("Lead Source", "Website Inquiry Form");
  f.append("LEADCF51", "on"); // consent checkbox
  f.append("Lead Status", "New Inquiry");
  const res = await fetch(ZOHO_URL, { method: "POST", body: f, redirect: "manual", headers: { "content-type": "application/x-www-form-urlencoded" } });
  if (res.status >= 400) throw new Error("zoho_" + res.status);
}

async function bump(kv, key, ttl) {
  const n = Number((await kv.get(key)) || 0) + 1;
  await kv.put(key, String(n), { expirationTtl: Math.max(60, ttl) });
  return n;
}

async function sha(s) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("nsa:" + s));
  return [...new Uint8Array(d)].slice(0, 12).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Turnstile siteverify. Tokens are single-use; the browser never calls siteverify.
const TS_ACTION = "intake";
async function verifyTurnstile(env, token, ip) {
  if (typeof token !== "string" || !token || token.length > 2048) return false;
  if (!env.TURNSTILE_SECRET) { console.log("turnstile_error", "TURNSTILE_SECRET not set"); return false; }
  // Production allowlist only: never include localhost / 127.0.0.1 here.
  const hosts = String(env.TURNSTILE_HOSTNAMES || DEFAULT_ORIGINS.map((o) => new URL(o).hostname).join(","))
    .split(",").map((h) => h.trim().toLowerCase()).filter(Boolean);
  const form = new URLSearchParams({ secret: env.TURNSTILE_SECRET, response: token });
  if (ip) form.set("remoteip", ip);
  try {
    const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: form, signal: AbortSignal.timeout(10000) });
    if (!r.ok) { console.log("turnstile_error", `siteverify_http_${r.status}`); return false; }
    const d = await r.json();
    if (d.success !== true) { console.log("turnstile_rejected", Array.isArray(d["error-codes"]) ? d["error-codes"].join(",") : "unsuccessful"); return false; }
    if (d.action !== TS_ACTION) { console.log("turnstile_rejected", "unexpected_action"); return false; }
    if (!hosts.includes(String(d.hostname || "").toLowerCase())) { console.log("turnstile_rejected", "unexpected_hostname"); return false; }
    return true;
  } catch (e) { console.log("turnstile_error", String(e && e.message)); return false; }
}
