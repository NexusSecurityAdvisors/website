/**
 * POST /csp-report — receives CSP violation reports for the enforced policy (Cloudflare Pages Function)
 *
 * site/_headers points the enforced Content-Security-Policy at this endpoint (report-uri, and
 * report-to via the "csp" Reporting-Endpoints group). The Report-Only policy already reports
 * straight to PostHog; until this function existed, enforced-policy reports got a 405 and were lost.
 *
 * Accepts both browser formats:
 *   - application/csp-report    legacy report-uri: { "csp-report": { "document-uri": ..., ... } }
 *   - application/reports+json  Reporting API:      [ { "type": "csp-violation", "body": { ... } } ]
 *
 * Each report is reduced to the fields needed to fix the policy. URLs lose their query string and
 * fragment, so tokens, emails or form values in a visitor's URL never leave the edge. The cleaned
 * reports go to PostHog's CSP endpoint tagged v=enforce-1, which records them as $csp_violation
 * events alongside the Report-Only ones (tagged v=ro-1).
 *
 * The endpoint always answers 204 for a well-formed POST, so it reveals nothing to a caller.
 * Limits: 64 KB body, 20 reports per request, 512 characters per field. The zone's rate-limiting
 * rule and the WAF exception in custom rule 1 (POST to www /csp-report only) still apply.
 */
const POSTHOG_REPORT_URL =
  "https://us.i.posthog.com/report/?token=phc_DuzGMcGgYX9NfaIQr0gtNWEDi2dmQr5kZr4CwxgUJA2&v=enforce-1";
const MAX_BODY = 64 * 1024;
const MAX_REPORTS = 20;
const MAX_FIELD = 512;
const ACCEPTED_TYPES = ["application/csp-report", "application/reports+json", "application/json"];

// Reporting API (camelCase) name -> legacy report-uri (kebab-case) name.
const FIELDS = {
  documentURL: "document-uri",
  referrer: "referrer",
  blockedURL: "blocked-uri",
  effectiveDirective: "effective-directive",
  originalPolicy: "original-policy",
  disposition: "disposition",
  sourceFile: "source-file",
  lineNumber: "line-number",
  columnNumber: "column-number",
  statusCode: "status-code",
  sample: "script-sample",
};
const URL_FIELDS = new Set(["documentURL", "referrer", "blockedURL", "sourceFile"]);
const NUMBER_FIELDS = new Set(["lineNumber", "columnNumber", "statusCode"]);
const EXTENSION = /^(chrome|moz|safari|safari-web|ms-browser)-extension(:|$)/i;

const noContent = () => new Response(null, { status: 204, headers: { "cache-control": "no-store" } });

export async function onRequest(context) {
  const { request } = context;
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: { Allow: "POST" } });
  }

  const type = (request.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  if (!ACCEPTED_TYPES.includes(type)) return new Response("Unsupported media type", { status: 415 });

  const declared = Number(request.headers.get("content-length") || 0);
  if (declared > MAX_BODY) return new Response("Payload too large", { status: 413 });
  const text = await request.text();
  if (text.length > MAX_BODY) return new Response("Payload too large", { status: 413 });

  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  const reports = extract(payload).slice(0, MAX_REPORTS).map(clean).filter(Boolean);
  if (reports.length) {
    const body = JSON.stringify(
      reports.map((r) => ({ type: "csp-violation", age: 0, url: r.documentURL || "", body: r }))
    );
    context.waitUntil(
      fetch(POSTHOG_REPORT_URL, {
        method: "POST",
        // PostHog silently drops reports that arrive without the browser's User-Agent, and it needs
        // the visitor IP for geo enrichment (the project discards the raw IP after lookup), the same
        // way the /r7 relay forwards it.
        headers: {
          "content-type": "application/reports+json",
          "user-agent": request.headers.get("user-agent") || "nexus-csp-report-relay",
          "x-forwarded-for": request.headers.get("cf-connecting-ip") || "",
        },
        body,
      })
        .then((r) => {
          if (!r.ok) console.warn(`csp-report: PostHog returned ${r.status}`);
        })
        .catch((e) => console.warn(`csp-report: forward failed: ${e}`))
    );
  }
  return noContent();
}

// Normalize both browser formats to a list of camelCase report bodies.
function extract(payload) {
  if (Array.isArray(payload)) {
    return payload
      .filter((r) => r && r.type === "csp-violation" && r.body && typeof r.body === "object")
      .map((r) => r.body);
  }
  const legacy = payload && payload["csp-report"];
  if (legacy && typeof legacy === "object") {
    const out = {};
    for (const [camel, kebab] of Object.entries(FIELDS)) {
      if (kebab in legacy) out[camel] = legacy[kebab];
    }
    if (!out.effectiveDirective && legacy["violated-directive"]) out.effectiveDirective = legacy["violated-directive"];
    return [out];
  }
  return [];
}

function clean(raw) {
  const out = {};
  for (const name of Object.keys(FIELDS)) {
    const value = raw[name];
    if (value === undefined || value === null || value === "") continue;
    if (NUMBER_FIELDS.has(name)) {
      const n = Number(value);
      if (Number.isFinite(n)) out[name] = n;
    } else if (typeof value === "string") {
      out[name] = (URL_FIELDS.has(name) ? stripUrl(value) : value).slice(0, MAX_FIELD);
    }
  }
  // A report with neither a directive nor a blocked resource is useless for fixing the policy.
  if (!out.effectiveDirective && !out.blockedURL) return null;
  // Violations raised by a visitor's browser extension say nothing about our pages.
  if (EXTENSION.test(out.sourceFile || "") || EXTENSION.test(out.blockedURL || "")) return null;
  return out;
}

// Keep scheme, host and path; drop query string and fragment. Keywords like "inline" pass through.
function stripUrl(value) {
  try {
    const u = new URL(value);
    return `${u.protocol}//${u.host}${u.pathname}`;
  } catch {
    return value.split(/[?#]/)[0];
  }
}
