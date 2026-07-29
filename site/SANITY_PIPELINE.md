# Formspree → Sanity pipeline

How submissions flow from the public form into Sanity Studio for curator review.

## Overview

```
submit.html  →  Formspree (mbdnweyz)  →  Webhook  →  Cloudflare Worker  →  Sanity
                     ↓
              Email notification (keep this)
```

Formspree stays the intake layer (handles spam, email alerts, file storage). Sanity becomes the editorial system of record.

## Phase 1 — Sanity project (one-time)

1. Create a project at [sanity.io/manage](https://www.sanity.io/manage)
2. Note **Project ID** and create dataset `production`
3. From repo root:
   ```bash
   cd sanity
   npm install
   # Set SANITY_STUDIO_PROJECT_ID in .env or edit sanity.config.js
   npm run dev
   ```
4. Open Studio locally, confirm **Submission** document type appears
5. Create an API token with **Editor** permissions (needs create + upload)

## Phase 2 — Deploy webhook worker

```bash
cd workers/formspree-to-sanity
npx wrangler secret put SANITY_PROJECT_ID
npx wrangler secret put SANITY_WRITE_TOKEN
npx wrangler deploy
```

Copy the worker URL (e.g. `https://dadda-formspree-to-sanity.your-subdomain.workers.dev`).

## Phase 3 — Connect Formspree

1. Formspree dashboard → form **mbdnweyz** → **Settings** → **Webhooks**
2. Add webhook URL pointing to the worker
3. Submit a test entry on `/submit.html`
4. Confirm a new **Submission** document appears in Sanity Studio

## Phase 4 — Curator workflow (Sanity)

| Status | Meaning |
|--------|---------|
| `received` | Just arrived from form |
| `in_review` | Curator is reviewing |
| `approved` | Cleared for publish |
| `declined` | Do not use |
| `needs_follow_up` | Waiting on participant |

Follow `SUBMIT_WORKFLOW.md` for child face blur before any public use. Track `childFacesBlurred` in Sanity when done.

## Phase 5 — Publish to site (future)

Today the home grid reads static `assets/dads.js`. Later options:

- **A.** Approved submissions manually added to `dads.js` (simplest)
- **B.** Site fetches published dads from Sanity at build time (GROQ + static build)
- **C.** Site fetches at runtime from Sanity CDN (needs API or prebuilt JSON)

Recommend **B** for launch: build script exports approved dads → `dads.js`.

## Field mapping

| Form field | Sanity field |
|------------|--------------|
| `full_legal_name` | `fullLegalName` |
| `preferred_name` | `preferredName` |
| `email` | `email` |
| `supporting_images[]` | `supportingImages[]` |
| `follow_up_interview[]` | `followUpInterview` |
| … | See `sanity/schemas/submission.js` |

## Troubleshooting

- **Webhook 500** — check worker logs: `wrangler tail`
- **Images missing** — Formspree paid plan may be required for file URLs in webhooks; verify payload shape in logs
- **Duplicate submissions** — store `formspreeId` and dedupe in worker if needed

## Pre-launch home page

Until **August 7, 2026**, the home archive is hidden. Config: `site/assets/site-config.js` → `dadsArchiveLaunch`.

About + Submit stay live in the header.
