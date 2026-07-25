# dadda? Exhibition — Web

Static site for **dadda?**, a photo exhibition about single fatherhood by Mason Rose.

**Production domain:** [www.daddaexhibition.com](https://www.daddaexhibition.com)

---

## Folder structure

```
DADDA_CURSOR/
├── landing/              # Coming-soon page → production (main branch)
│   ├── index.html
│   ├── styles.css
│   ├── _headers          # Cache + security headers
│   ├── _redirects        # Apex → www redirect
│   └── assets/
├── site/                 # Full exhibition site → preview (dev branch)
│   ├── index.html
│   ├── about.html, fathers.html, stories.html, …
│   └── assets/
│       └── site.css
├── scripts/
│   └── build.sh          # Stages site/ into landing/ on dev branch builds
├── wrangler.toml         # Cloudflare Pages config
├── .gitignore
└── README.md
```

| Folder | Branch | Purpose |
|--------|--------|---------|
| `landing/` | `main` | Live coming-soon page at www.daddaexhibition.com |
| `site/` | `dev` | Full multi-page site — preview only until launch |

---

## Branch strategy (Cloudflare Pages)

| Branch | Build output | URL |
|--------|--------------|-----|
| `main` | `landing/` | Production — www.daddaexhibition.com |
| `dev` | `site/` (staged via build script) | Cloudflare preview URL (e.g. `abc123.dadda-exhibition.pages.dev`) |

**How it works:** `wrangler.toml` sets `pages_build_output_dir = "landing"`. On `main`, Cloudflare deploys `landing/` as-is. On `dev`, `scripts/build.sh` copies `site/` into `landing/` before deploy (ephemeral — nothing is committed).

**Workflow:**

1. Edit the full site in `site/` on the `dev` branch → push → check the Cloudflare preview URL.
2. Keep `landing/` updated on `main` for the live coming-soon page.
3. When ready to launch the full site, change `pages_build_output_dir` to `"site"` in `wrangler.toml` (or merge `dev` → `main` and update the build script), then push.

---

## Preview locally

**Landing page (production):**

```bash
cd landing
python3 -m http.server 8080
```

Open [http://localhost:8080](http://localhost:8080)

**Full site (WIP):**

```bash
cd site
python3 -m http.server 8080
```

---

## Deploy landing NOW (manual upload)

Fastest path — no Git or build step required:

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages** → **Upload assets**
2. Project name: `dadda-exhibition`
3. **Upload only the contents of the `landing/` folder** — drag in `index.html`, `styles.css`, `_headers`, `_redirects`, and the `assets/` folder. Do not upload the repo root, `site/`, or `scripts/`.
4. Deploy
5. **Custom domains** → add `www.daddaexhibition.com`
6. Add `daddaexhibition.com` as a second custom domain (the `_redirects` file sends apex traffic to www)

**Wrangler CLI alternative:**

```bash
npx wrangler pages deploy landing --project-name=dadda-exhibition
```

---

## GitHub + Cloudflare Pages (ongoing deploys)

### 1. Initialize Git and push to GitHub

```bash
cd "/Users/b/Library/CloudStorage/Dropbox-MasonRosePhoto/00_PROJECTS/_DADDA/08_POST_WORK_FOLDERS/DADDA_CURSOR"

git init   # skip if .git already exists
git add .
git commit -m "Initial commit: landing page + site mockup"
git branch -M main
git remote add origin git@github.com:YOUR_USERNAME/dadda-exhibition.git
git push -u origin main

git checkout -b dev
git push -u origin dev
```

### 2. Connect Cloudflare Pages to GitHub

1. [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
2. Select the `dadda-exhibition` repo
3. Build settings (from `wrangler.toml`):
   - **Production branch:** `main`
   - **Build command:** `bash scripts/build.sh`
   - **Build output directory:** `landing`
   - **Framework preset:** None
4. Save and deploy

### 3. Custom domain — www.daddaexhibition.com

1. Pages project → **Custom domains** → **Set up a custom domain**
2. Enter `www.daddaexhibition.com`
3. If the domain is on Cloudflare, DNS records are added automatically

### 4. Apex redirect — daddaexhibition.com → www

Two parts (both needed):

1. **DNS:** Add `daddaexhibition.com` as a custom domain on the same Pages project (Cloudflare adds the CNAME/flattened record).
2. **Redirect rule:** `landing/_redirects` already contains:
   ```
   https://daddaexhibition.com/* https://www.daddaexhibition.com/:splat 301
   ```

Alternatively, use a Cloudflare **Bulk Redirect** or **Redirect Rule** in the dashboard if you prefer not to use `_redirects`.

### 5. Verify branch previews

1. Push a change to `dev`
2. Open the preview URL from the deployment log in Cloudflare
3. Confirm the full site loads (nav, pages, assets)

---

## Launch full site (when ready)

Change build output from `landing` to `site`:

**Option A — Update wrangler.toml (recommended):**

```toml
pages_build_output_dir = "site"

[build]
command = ""
```

Merge `dev` → `main` and push. Production serves `site/` directly.

**Option B — Promote via build script:**

Edit `scripts/build.sh` so `main` also copies from `site/`, or remove the branch check entirely.

---

## Landing page files

| File | Purpose |
|------|---------|
| `landing/index.html` | Coming-soon page with canonical + Open Graph tags |
| `landing/styles.css` | Full-viewport layout |
| `landing/assets/landing.jpg` | Desktop hero (1920px) |
| `landing/assets/landing-mobile.jpg` | Mobile hero |
| `landing/assets/favicon.png` | Browser tab icon |
| `landing/_headers` | Security headers + cache rules |
| `landing/_redirects` | Apex → www redirect |

---

## Full site pages

| Page | File |
|------|------|
| Home | `site/index.html` |
| Fathers | `site/fathers.html` |
| Stories | `site/stories.html` |
| About | `site/about.html` |
| Submit | `site/submit.html` |
| Archive | `site/archive.html` |

Styles: `site/assets/site.css`

---

## Notes

- No build toolchain — plain HTML/CSS/static assets.
- Preview PNGs in `site/preview-*.png` are design references only (gitignored).
- Do not commit Cloudflare API tokens or `.wrangler/` cache (gitignored).
