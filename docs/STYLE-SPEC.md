# Shared style spec: nexussecurityadvisors.com and dansorensen.info

The Nexus site is the reference. dansorensen.info (DSI) aligns to it so the two read as one brand. Values come from the live Nexus CSS (`#nsa` scope in `site/css/`) as of 2026-11-18.

## 1. Color tokens (already identical on both sites)

| Token | Value | Use |
|---|---|---|
| `--bg` | `#0E131A` | page background |
| `--bg2` | `#0E1B2E` | alternate sections, footer |
| `--deep` | `#152A45` | hover fills, deep panels |
| `--glass` | `rgba(21,42,69,.38)` | cards, chips |
| `--line` | `rgba(201,204,207,.14)` | hairlines, borders |
| `--line2` | `rgba(43,155,244,.35)` | accent borders, ghost buttons, dropdowns |
| `--blue` | `#1A6FD1` | primary button |
| `--blue-h` | `#155CB0` | primary button hover |
| `--accent` | `#2B9BF4` | links, eyebrow text, nav underline |
| `--text` | `#F3F5F7` | headings, emphasis |
| `--silver` | `#C9CCCF` | body text |
| `--muted` | `#A7AEB8` | secondary text, dates |

Don't add new colors without adding a token here first. Text on `--bg`/`--bg2` must keep at least 4.5:1 contrast (WCAG 2.2 AA). `--muted` on `--bg` passes; don't put `--muted` on `--deep`.

## 2. Typography

| Element | Font | Size | Line height | Notes |
|---|---|---|---|---|
| Headings `h1`–`h3` | `--head`: Questrial, "Segoe UI", Arial, sans-serif | — | — | weight 400, `letter-spacing:.2px`, color `--text` |
| `h1` | | `clamp(36px, 5.4vw, 62px)` | 1.08 | margin `16px 0 20px`, max-width ~860px |
| `h2` | | `clamp(28px, 3.4vw, 40px)` | 1.15 | margin `10px 0 14px` |
| `h3` | | `20px` | 1.3 | margin `0 0 8px` |
| Body | `--body`: Inter, "Helvetica Neue", Helvetica, Arial, sans-serif | `16px` | 1.65 | color `--silver`, antialiased |
| Nav links | Inter | `14px` | — | color `--silver` |
| Buttons | Inter | `15px` (`.sm`: `14px`) | 1.2 | weight 600 |

Both fonts are self-hosted WOFF2 (no third-party font requests) and preloaded on every page.

## 3. Layout

- Container `.wrap`: `max-width:1180px; margin:0 auto; padding:0 22px`.
- Sticky header bar: `background:rgba(14,19,26,.72)`, `backdrop-filter:blur(14px)`, bottom border `1px solid var(--line)`.

## 4. Navigation

- **Links:** plain text, 26px gap, 14px, `--silver`. Hover: color `--text` plus a 1px `--accent` underline that grows from 0 to 100% width over .25s. No pill or background on hover.
- **Current page:** same as hover, underline at full width (`aria-current="page"`).
- **Dropdown** (`.dd` / `.ddm`): trigger text ends with ▾; panel `min-width:240px`, `padding:10px`, background `rgba(11,16,23,.97)`, border `1px solid var(--line2)`, radius 10px, shadow `0 18px 40px rgba(0,0,0,.45)`, fade and 4px slide-in over .2s; items 14px, `padding:8px 10px`, radius 6px.
- **Primary CTA** at the right end of the bar: `.btn.sm`.
- **Item count:** no more than 5 top-level links plus one dropdown and the CTA. Group everything else under the dropdown.

## 5. Buttons

| Variant | Spec |
|---|---|
| `.btn` | `background:var(--blue)`, `#fff`, `padding:13px 24px`, **radius 6px**, weight 600, 15px. Hover: `--blue-h`, `box-shadow:0 8px 30px rgba(43,155,244,.28)`, `translateY(-1px)`. |
| `.btn.sm` | `padding:10px 18px`, 14px |
| `.btn.ghost` | `background:rgba(14,19,26,.3)`, `border:1px solid rgba(243,245,247,.55)`, no shadow |

Transitions: background .2s, box-shadow .25s, transform .2s. Respect `prefers-reduced-motion` (no translate).

## 6. Constraints both sites keep

- No inline styles or scripts (strict CSP, no `'unsafe-inline'`). All styling lives in stylesheets.
- Visible focus ring on every interactive element (`outline:2px solid var(--accent); outline-offset:3px; border-radius:4px` on `:focus-visible`). Both sites already do this, and both honor `prefers-reduced-motion`.

## 7. DSI alignment checklist

Differences found in `dansorensen-info/site/css/site.css` on 2026-11-18. Each is a small CSS-only change for the "[DSI] Align typography and nav styling to the shared Nexus style spec" card:

| Item | DSI today | Spec |
|---|---|---|
| Body size | 17px | 16px |
| `h1` | `clamp(34px,5vw,56px)`, lh 1.1 | `clamp(36px,5.4vw,62px)`, lh 1.08 |
| `h2` | `clamp(26px,3.2vw,36px)`, lh 1.2 | `clamp(28px,3.4vw,40px)`, lh 1.15 |
| Headings | weight/letter-spacing not set | weight 400, `letter-spacing:.2px`, color `--text` |
| Container | 1140px / 20px padding | 1180px / 22px |
| Header bar | `.92` opacity, 8px blur | `.72` opacity, 14px blur |
| Nav links | 15px, pill background on hover/current | 14px, accent underline on hover/current, no background |
| Dropdown | radius 12px, `--line` border, `--bg2` background, no shadow | radius 10px, `--line2` border, `rgba(11,16,23,.97)`, shadow |
| Buttons | radius 10px, `padding:12px 20px`, no hover lift | radius 6px, `padding:13px 24px`, hover shadow and 1px lift |
| Ghost button | transparent, `--line2` border | `rgba(14,19,26,.3)`, `rgba(243,245,247,.55)` border |
| Nav item count | Home, Work With Me, Publications, Books, About + More ▾ (Recognition, FAQ, Nexus) + CTA | Already within spec; no change |
