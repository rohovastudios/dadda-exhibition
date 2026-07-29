# dadda? — full site (dev)

Tyler Mitchell–inspired layout with dadda? serif typography on a clean white/neutral background. Pink paper texture is **production landing only** — not used on dev site pages.

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
2. Curator SOP (child face blur, approval): `SUBMIT_WORKFLOW.md`

### Formspree / Airtable field names

| Field | Name attribute |
|-------|----------------|
| Full legal name | `full_legal_name` |
| Preferred name | `preferred_name` |
| Email | `email` |
| Phone | `phone` |
| Country of residence | `country_of_residence` |
| Preferred contact method | `preferred_contact_method` |
| Remain anonymous | `remain_anonymous` |
| Fatherhood relationship (multi) | `fatherhood_relationship[]` |
| Children info | `children_info` |
| Story response 1 prompt | `response_1_prompt` |
| Story response 1 text | `response_1` |
| Story response 2 prompt | `response_2_prompt` |
| Story response 2 text | `response_2` |
| Story response 3 prompt | `response_3_prompt` |
| Story response 3 text | `response_3` |
| Supporting images (multi file) | `supporting_images[]` |
| Image descriptions | `image_descriptions` |
| Consent checkboxes | `consent_18`, `consent_name_options`, `consent_privacy_edits`, `consent_children_not_shown`, `consent_child_photos_obscured`, `consent_rights`, `consent_usage`, `consent_voluntary` |
| Signature (typed) | `signature` |
| Signature (drawn PNG data URL) | `signature_image` |
| Signature method | `signature_type` |
| Follow-up interview (multi) | `follow_up_interview[]` |
