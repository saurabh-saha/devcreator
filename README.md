# DevCreator

AI-powered content studio for developer-creators. Generate ideas, write content for LinkedIn, Medium, Substack, GitHub, and more — all from one place.

**Live:** https://devcreator-web.vercel.app  
**Stack:** Next.js · Neon (Postgres) · Auth.js · Vercel · Gemini / Groq

---

## Google Auth (Sign In)

Users sign in with Google OAuth via Auth.js.

**How it works:**
1. User clicks "Sign in with Google" → redirected to Google
2. Google calls back to `/api/auth/callback/google`
3. Auth.js creates/finds the user in the `users` table and sets a session cookie

**Where to update when adding a new domain / callback URL:**

1. **Google Cloud Console** → APIs & Services → Credentials → your OAuth 2.0 Client  
   Add to **Authorized JavaScript origins:**
   ```
   https://your-domain.com
   ```
   Add to **Authorized redirect URIs:**
   ```
   https://your-domain.com/api/auth/callback/google
   ```

2. **Vercel env var** → update `NEXTAUTH_URL` to the new domain

3. **Local** → `apps/web/.env.local` → update `NEXTAUTH_URL=http://localhost:3001`

**Google Cloud Console:** console.cloud.google.com → APIs & Services → Credentials

---

## Integrations

### GitHub

**How it works:**
- User clicks Connect on the Integrations page → redirected to GitHub OAuth
- GitHub calls back to `/api/connect/github/callback`
- Access token stored in `platform_accounts` table

**Where to update:**

**GitHub Developer Settings** → OAuth Apps → your app  
- **Homepage URL:** `https://devcreator-web.vercel.app`  
- **Authorization callback URL:**
  ```
  https://devcreator-web.vercel.app/api/connect/github/callback
  ```
  For local dev, add a separate OAuth app with:
  ```
  http://localhost:3001/api/connect/github/callback
  ```

**Env vars required:**
```
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
```

---

### LinkedIn

**How it works:**
- User clicks Connect → redirected to LinkedIn OAuth
- LinkedIn calls back to `/api/connect/linkedin/callback`
- Access token stored in `platform_accounts` table

**Where to update:**

**LinkedIn Developer Portal** (developer.linkedin.com) → your app → Auth → Authorized redirect URLs:
```
https://devcreator-web.vercel.app/api/connect/linkedin/callback
http://localhost:3001/api/connect/linkedin/callback
```

**Env vars required:**
```
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
```

### Medium

**How it works:**
- User enters their Medium username on the Integrations page (no OAuth — Medium has no OAuth API)
- The app validates by fetching `https://medium.com/feed/@username` (RSS)
- Username stored in `platform_accounts` with `platform = 'medium'`
- Content is imported via RSS for Creator Brain; clap counts fetched separately

**To add:** No OAuth app needed. Just enter username in the Integrations page.

---

### Substack

**How it works:**
- Same as Medium — username only, no OAuth
- Validates via `https://username.substack.com/feed` (RSS)
- Username stored in `platform_accounts` with `platform = 'substack'`

**To add:** No OAuth app needed. Just enter username in the Integrations page.

---

### Chrome Extension

Located at `apps/extension/` — Manifest V3 Chrome extension.

**What it does:**
- Scrapes LinkedIn post + article analytics from the user's LinkedIn profile page (impressions, likes, comments, reposts)
- Scrapes Medium stats via RSS
- Sends the data to the DevCreator web app via `fetch` with `credentials: "include"` (shares the browser session cookie — no separate login)

**How it works:**
- `background.js` — service worker; handles all `fetch` calls (no CORS restriction from background) and orchestrates LinkedIn scraping
- `content-main.js` / `content-fetch.js` — injected into the DevCreator web app page to bridge messages between the app and the background worker
- `content.js` — injected into LinkedIn/Medium pages to extract DOM data
- LinkedIn scraping: opens a hidden tab to `linkedin.com/in/<handle>/recent-activity/all/` and `…/articles/`, scrolls to load infinite scroll, then reads `data-urn` containers for post metrics via `chrome.scripting.executeScript`

**To install locally (dev):**
1. Go to `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** → select `apps/extension/`

**To update the production URL** (currently points to `localhost:3001` and `devcreator.app`):  
Edit `manifest.json` → `content_scripts[].matches` → add `https://devcreator-web.vercel.app/*`

**To publish to Chrome Web Store:**
1. Zip the `apps/extension/` folder
2. Upload at [chrome.google.com/webstore/devconsole](https://chrome.google.com/webstore/devconsole)

---



## Deployment (Vercel)

**Project:** `devcreator-web` on Vercel (Hobby plan)  
**Branch:** `dev` → auto-deploys to production on every push  
**Root directory:** `apps/web`

**To deploy:**
```bash
git push origin dev
```
Vercel auto-builds and deploys. No manual step needed.

**To update env vars via CLI:**
```bash
cd apps/web
vercel link --project devcreator-web
vercel env rm VAR_NAME production --yes
vercel env add VAR_NAME production
# paste the value, hit Enter
```

**Required env vars in Vercel:**
```
DATABASE_URL
AUTH_SECRET
NEXTAUTH_URL
GOOGLE_GENERATIVE_AI_API_KEY
GROQ_API_KEY
LINKEDIN_CLIENT_ID
LINKEDIN_CLIENT_SECRET
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GITHUB_CLIENT_ID
GITHUB_CLIENT_SECRET
```

---

## Database (Neon)

**Provider:** Neon (neon.tech) — managed Postgres, Singapore region (`ap-southeast-1`)  
**Project:** DevConnect

**Tables:**
| Table | Purpose |
|---|---|
| `users` | Auth — one row per signed-in user |
| `creator_profiles` | Expertise, topics, tone, audience |
| `platform_accounts` | OAuth tokens for connected platforms |
| `saved_ideas` | Ideas saved from the Ideas screen |
| `drafts` | Studio drafts, auto-saved per idea+format |
| `ideas_cache` | Cached idea generation results (1h TTL) |
| `insights_cache` | Cached analytics insights |
| `knowledge_documents` | Imported content for Creator Brain |
| `linkedin_posts` | LinkedIn post analytics |
| `medium_claps` | Medium article clap counts |

**Tables are auto-created on first request** — each API route runs `CREATE TABLE IF NOT EXISTS` on startup (except `knowledge_documents`, `linkedin_posts`, `medium_claps` which were created manually).

**To connect and inspect:**
```bash
# Install psql or use node
cd apps/web
node -e "
const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL, { max: 1 });
sql\`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'\`
  .then(r => { console.log(r.map(x => x.table_name)); sql.end(); });
"
```

**Connection string is in:** `apps/web/.env.local` as `DATABASE_URL`

---

## Local Development

```bash
pnpm install
cd apps/web
cp .env.local.example .env.local   # fill in your keys
pnpm dev                           # runs on http://localhost:3001
```

**Prerequisites:** Node 22+, pnpm
