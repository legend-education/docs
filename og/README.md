# Open Graph image directory

This folder holds 1200×630 PNG/JPG cards used as `og:image` defaults and per-page overrides.

## Required assets

- `default.png` — site-wide fallback referenced by every page that doesn't set `og:image` explicitly.
- `common-core.png` — Common Core hub.
- `common-core-ela.png` — ELA hub.
- `common-core-math.png` — Math hub.

## Specs

- 1200 × 630 px, sRGB
- < 300 KB target, < 1 MB max
- Legend wordmark in lower-left, page title at top, gradient cream background (`#fdf6f0` → `#f4ede8`)

## Generating cards

These are flagged as `TODO` until the design team supplies them. Until then, social shares fall back to the page title + description, which still produce a valid Twitter `summary` card.
