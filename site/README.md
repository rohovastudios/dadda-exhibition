# dadda? — full site (dev)

Tyler Mitchell–inspired structure with dadda? pink/serif art direction.

## Pages

| Page | File |
|------|------|
| Home grid | `index.html` |
| Dad project (slides / grid / story) | `dad.html?slug=…` |
| About overlay | `about.html` |
| Contact | `contact.html` |
| Shop (Stripe prep) | `shop.html` |
| Submit (form + JotForm fallback) | `submit.html` |

## Home grid density

Pill on the right: **20 · 50 · 100 · 200**

- **20** — one image per dad (cover round)
- **50+** — round-robin through each dad’s gallery for the next image
- Tiers above available images are **disabled** automatically

Logic lives in `assets/dads.js` (`buildGridItems`).

## Dad data

Edit `assets/dads.js` — replace placeholder names, images, and story copy with final content. Each dad has:

- `slug`, `name`, `images[]`, `story`, `info`

Stories are folded into each dad project (no separate stories section).

## Preview locally

```bash
cd site
python3 -m http.server 8080
```

## Deploy preview (Cloudflare)

Push to **`dev`** branch — build copies `site/` → `landing/` for preview URL.

Production **`main`** still serves the coming-soon landing page.

## Shop checkout

1. Create [Stripe Payment Links](https://dashboard.stripe.com/payment-links)
2. Paste URLs into `shop.html` buttons
3. Remove `button--disabled` class

## Submit form

1. **Built-in:** replace `YOUR_FORM_ID` in `submit.html` with [Formspree](https://formspree.io) or Netlify Forms endpoint
2. **JotForm:** uncomment embed block in `submit.html`
