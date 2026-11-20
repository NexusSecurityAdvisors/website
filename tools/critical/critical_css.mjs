#!/usr/bin/env node
/**
 * Inline each page's critical CSS so the stylesheet bundle stops blocking first paint (PageSpeed).
 *
 *   (cd tools/critical && npm ci) && node tools/critical/critical_css.mjs site
 *
 * Run it last, after tools/bundle_styles.py and tools/stamp_assets.py. For every page with a
 * /css/b-<hash>.css bundle it:
 *   1. inlines the rules that page actually uses in <style data-critical> in <head> (beasties),
 *   2. moves the full bundle <link> to the end of <body>, where it no longer blocks rendering
 *      (it still supplies rules for classes that scripts add later, such as the open menu),
 *   3. writes the SHA-256 of every critical block into style-src in both CSP lines of site/_headers,
 *      so the CSP stays free of 'unsafe-inline'.
 * The script is idempotent: it first restores each page to its pre-critical form.
 * tools/check_site.py fails on a <style> block without data-critical or whose hash is not in style-src.
 */
import Beasties from "beasties";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.argv[2] || "site";
const CRITICAL = /<style data-critical>[\s\S]*?<\/style>\n?/g;
const BUNDLE = /[ \t]*<link rel="stylesheet" href="\/css\/b-[0-9a-f]{10}\.css">\n?/;

function pages(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? pages(p) : n.endsWith(".html") ? [p] : [];
  });
}

// Undo an earlier run: drop the critical block and put the bundle link back at the end of <head>.
function restore(html) {
  html = html.replace(CRITICAL, "");
  const m = html.match(BUNDLE);
  if (m && html.indexOf(m[0]) > html.indexOf("</head>")) {
    html = html.replace(m[0], "");
    html = html.replace("</head>", `${m[0].trim()}\n</head>`);
  }
  return html;
}

const beasties = new Beasties({
  path: root, publicPath: "/", preload: "body", pruneSource: false, mergeStylesheets: true,
  inlineFonts: true, preloadFonts: false, compress: true, reduceInlineStyles: false, logLevel: "warn",
});

const hashes = new Set();
let done = 0;
for (const file of pages(root).sort()) {
  let html = restore(readFileSync(file, "utf8"));
  if (!BUNDLE.test(html)) { writeFileSync(file, html); continue; }
  html = await beasties.process(html);
  html = html.replace(' data-beasties-container', "");
  const blocks = [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)];
  if (blocks.length !== 1) throw new Error(`${relative(root, file)}: expected one critical <style>, found ${blocks.length}`);
  html = html.replace("<style>", "<style data-critical>");
  hashes.add(createHash("sha256").update(blocks[0][1], "utf8").digest("base64"));
  writeFileSync(file, html);
  done++;
}

const hdrPath = join(root, "_headers");
const list = [...hashes].sort().map((h) => `'sha256-${h}'`).join(" ");
let hdr = readFileSync(hdrPath, "utf8");
let n = 0;
hdr = hdr.replace(/(style-src 'self')(?: 'sha256-[A-Za-z0-9+/=]+')*/g, (_, a) => { n++; return list ? `${a} ${list}` : a; });
if (!n) throw new Error("_headers: no style-src 'self' directive found");
writeFileSync(hdrPath, hdr);
console.log(`${done} page(s): critical CSS inlined, ${hashes.size} distinct block(s); style-src updated in ${n} CSP line(s)`);
