# Vinyl Crate: App Store launch and the first 500 users

This is the runbook for taking Vinyl Crate from the website to the App Store
and keeping it healthy up to roughly 500 users. Everything in the codebase is
done; the steps below are the accounts, dashboards and builds that need you.

## How it fits together

```
 iPhone app (Capacitor)               Website (vinylcrate.vercel.app)
 ├─ static bundle in the app          ├─ same pages, served by Vercel
 └─ calls the API over HTTPS ──┐      └─ /privacy, /support, share links
                               ▼
                 Vercel API routes  (app/api/*/route.server.js)
                 ├─ /api/claude    cover → album, cheapest model first, daily cap
                 ├─ /api/discogs   pressings + tracklists, cached at the CDN
                 ├─ /api/upload    cover photo → your folder in storage
                 ├─ /api/account   DELETE: removes account, records, photos
                 └─ /api/health    uptime check + daily cron (keeps DB awake)
                               │
                               ▼
                 Supabase: Auth (email link / code / password),
                 Postgres with row-level security, Storage (album-art)
```

One codebase builds both targets:

| Command | Builds | Used by |
|---|---|---|
| `npm run build` | website + API routes | Vercel (automatic on push to `main`) |
| `npm run build:ios` | static bundle in `out/`, copied into `ios/` | Xcode |

API files are named `route.server.js`; the iOS build leaves them out (see
`next.config.ts`), so no server code or secret can end up inside the app.

## What's already in place

- **Accounts for anyone.** Email sign-in by link or 6-digit code (the code
  matters in the app, where links open in Mail), password sign-in for the App
  Review account, and in-app account deletion (an App Store requirement).
- **Per-user data, enforced by the database.** Every record and cover photo
  belongs to its owner via row-level security; collections can be public
  (share links) or private.
- **Cost controls.** Cover scans try Claude Haiku 5.5 first (~$0.0001) and
  escalate to Sonnet 5.5 (~$0.003) only when needed; 40 scans per user per day;
  every scan's model and cost is logged in `identify_events`.
- **Capacity controls.** Discogs responses are cached on Vercel's CDN (its
  limit is 60 requests a minute shared by everyone); uploads are resized to
  ~150 KB and capped at 2 MB; collections load in pages past Supabase's
  1,000-row limit.
- **Native app.** Capacitor 8 iOS project (`ios/`), iPhone-only, bundle id
  `com.tonsoproductions.vinylcrate`, camera and photo permissions, haptic
  click wheel, native share sheet, CSV export to Files, `vinylcrate://`
  sign-in links, icon and splash screen.
- **Two looks.** Settings → Appearance switches the whole interface between
  *Classic iPod* and *Wood Hi-Fi* (walnut, brass and a turntable in place of
  the click-wheel player). Themes are listed in `lib/themes.js`; see
  "Adding a theme" at the end.
- **Privacy pages and declarations.** `/privacy/`, `/terms/`,
  `/delete-account/` and `/support/` on the website, linked from Settings →
  About; an Apple privacy manifest (`ios/App/App/PrivacyInfo.xcprivacy`); and
  `docs/APP_PRIVACY.md`, the answers to paste into App Store Connect.
- **Ops.** `/api/health`, a daily Vercel cron, CI on GitHub (lint + both
  builds), `.env.example` listing every setting.

---

## 1. Supabase (≈20 minutes)

1. **Run the migration.** SQL Editor → paste `supabase/migrations/003_multi_user.sql` → Run.
   It adds profiles (with the Public Collection switch), the scan log and an index. Safe to re-run.
   Then run `supabase/migrations/004_favorites_and_wants.sql` the same way (favorites and the wish list).
2. **Open sign-ups.** Authentication → Sign In / Providers → Email → turn **Allow new users to sign up** back on.
3. **Redirect URLs.** Authentication → URL Configuration → add
   `vinylcrate://auth-callback` (the app) and `https://vinylcrate.vercel.app/**` alongside
   `http://localhost:3000/**`. Set the Site URL to `https://vinylcrate.vercel.app`.
4. **Put the code in the email.** Authentication → Emails → *Magic Link* template: add a line such as
   `<p>Or enter this code in the app: <strong>{{ .Token }}</strong></p>`.
5. **Custom email sender (required before launch).** Supabase's built-in email
   only sends a few messages an hour, which would block sign-ins. Create a free
   [Resend](https://resend.com) account, verify a domain you own, then
   Authentication → Emails → SMTP Settings with Resend's SMTP details. Then raise
   Authentication → Rate Limits → emails per hour (e.g. 100).
6. **Upgrade to Pro ($25/month) at launch.** Free projects pause after a week
   without traffic, have no backups and only 1 GB of storage, about 10,000 cover
   photos. Pro gives 100 GB of storage, daily backups and no pausing.
7. **Service role key.** Project Settings → API → copy the `service_role` key
   into Vercel as `SUPABASE_SERVICE_ROLE_KEY` (step 2). Never put it in the app
   or prefix it with `NEXT_PUBLIC_`.
8. **App Review account.** Authentication → Users → Add user → e.g.
   `appreview@yourdomain`, with a password, auto-confirmed. Add a few records
   to it so reviewers see a real crate.

## 2. Vercel (≈10 minutes)

Project → Settings → Environment Variables (Production), using `.env.example`:

| Variable | Value |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | from Supabase step 7 |
| `VISION_MODELS` | `claude-haiku-5-5,claude-sonnet-5-5` |
| `IDENTIFY_DAILY_LIMIT` | `40` |
| `NEXT_PUBLIC_SITE_URL` | `https://vinylcrate.vercel.app` (or your domain) |
| `NEXT_PUBLIC_FEATURED_OWNER` | your user id (Supabase → Authentication → Users), so the website still opens on your crate |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | a support address you're happy to publish |
| `GEMINI_API_KEY` | delete, no longer used |

Then redeploy. Also:
- **Plan.** Hobby is for non-commercial use; if Vinyl Crate earns money, move
  to Pro ($20/month). The daily health cron works on either.
- **Domain (optional).** Settings → Domains for e.g. `vinylcrate.app`; then
  update `NEXT_PUBLIC_SITE_URL`, the Supabase Site URL and `build:ios`'s
  `NEXT_PUBLIC_API_BASE`.

## 3. Anthropic and Discogs (≈5 minutes)

- **Anthropic Console → Limits:** set a monthly spend limit (e.g. $50) and an
  email alert at 50%. Worst case with the daily cap is bounded, but a limit
  protects against surprises.
- **Discogs:** the existing personal token is fine at this scale. If logs show
  "Discogs rate limit hit" often, request a higher limit from Discogs or move
  to per-user Discogs sign-in.

## 4. Build the iPhone app

1. Install **Xcode** from the Mac App Store (about 15 GB), open it once to
   accept the licence, then point the command-line tools at it:
   ```bash
   sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
   ```
2. Build the bundle and open the project:
   ```bash
   npm run build:ios
   ```
   ```bash
   npm run ios:open
   ```
3. In Xcode: select the **App** target → Signing & Capabilities → choose your
   team (needs the Apple Developer Program, below). The bundle id is already set.
4. Run on a simulator, then on your iPhone. Check sign-in (link *and* code),
   adding a record with the camera, the click-wheel haptics, sharing and CSV export.
5. Rebuild after any web change with `npm run build:ios` (it re-syncs `ios/`).

## 5. App Store Connect

1. Join the **Apple Developer Program** ($99/year) at developer.apple.com.
2. App Store Connect → Apps → **+** → New App: iOS, name *Vinyl Crate* (pick an
   alternative if taken), bundle id `com.tonsoproductions.vinylcrate`, SKU `vinylcrate`.
3. **App information:** category Music (secondary: Lifestyle). Privacy Policy URL
   `https://vinylcrate.vercel.app/privacy/`; Support URL `…/support/`. Deploy the
   website first so these pages (and `/terms/`, `/delete-account/`) are live
   before you submit; reviewers open them.
4. **App Privacy:** copy the answers from `docs/APP_PRIVACY.md` (data types, all
   *linked to the user*, *not used for tracking*, purpose *App Functionality*):
   Contact Info → Email Address; User Content → Photos or Videos; User Content →
   Other User Content (collection); Identifiers → User ID; Usage Data → Product
   Interaction (scan log).
5. **Age rating:** 4+.
6. **Screenshots:** iPhone 6.9" (1320 × 2868) from the simulator (iPhone 17 Pro Max):
   Albums, Now Playing, the Turntable (or Cover Flow), Import with a result,
   Settings → Appearance.
7. **Archive and upload:** in Xcode choose *Any iOS Device* → Product → Archive →
   Distribute App → App Store Connect. Test it with **TestFlight** (internal
   testers, then up to 10,000 external testers) before submitting.
8. **Review notes:** give the App Review account's email and password, and say
   that sign-in is by email link or code, with password sign-in under
   *Use a Password*; covers are identified by Claude and pressings come from Discogs.

### Review risks to weigh before submitting

- **Guideline 5.2.5 (Apple products and trademarks).** The Cover Flow tab
  draws an iPod nano with a click wheel and uses the name *Cover Flow*. Apple
  may reject apps that look confusingly like its own products. The lowest-risk
  option is to ship with the Wood Hi-Fi look as the default: set
  `DEFAULT_THEME = 'wood'` in `lib/themes.js`, and take the store screenshots
  in that look. Classic iPod stays available under Settings → Appearance. If
  review still pushes back, rename the tab (e.g. *Flip*) in the `ipod` entry
  of `lib/themes.js` and make the player more stylised.
- **Guideline 4.2 (minimum functionality).** Web-based apps need to feel like
  apps. Vinyl Crate's camera import, haptics, share sheet, Files export, shake to
  shuffle and offline-bundled interface help; mention them in the review notes.

## 6. Running it: 500 users

### Expected monthly cost

| Item | At ~500 users | Notes |
|---|---|---|
| Supabase Pro | $25 | 8 GB database, 100 GB storage, backups |
| Vercel | $0–20 | Pro if commercial |
| Claude scans | ~$2–10 | ~15k scans/month at ~$0.0001 (Haiku 5.5), ~$0.003 when escalated |
| Resend email | $0 | free tier: 3,000 emails a month |
| Apple Developer | ~$8 | $99 a year |
| **Total** | **~$35–65/month** | |

### Capacity limits and when to act

| Limit | Where it bites | Signal | Action |
|---|---|---|---|
| Discogs 60 req/min | many people importing at once | "Discogs is busy" errors, `Discogs rate limit hit` in Vercel logs | higher limit from Discogs; per-user Discogs OAuth |
| Supabase storage | ~10k covers on Free | Supabase → Usage | Pro plan |
| Auth emails | sign-in bursts | "Too many sign-in emails" | raise Supabase email rate limit; Resend paid tier |
| Claude spend | heavy scanners | spend query below | lower `IDENTIFY_DAILY_LIMIT`; keep Haiku first |

### Watching it

- **Uptime:** point a free monitor (e.g. UptimeRobot) at `/api/health`.
- **Errors:** Vercel → Logs (filter by `/api/`).
- **Scan spend** (SQL Editor, runs as admin):
  ```sql
  select date_trunc('day', created_at) as day,
         count(*) as scans,
         count(distinct user_id) as users,
         round(sum(cost_usd), 2) as cost_usd,
         count(*) filter (where model = 'claude-haiku-5-5') as answered_by_haiku
  from identify_events
  where created_at > now() - interval '30 days'
  group by 1 order by 1 desc;
  ```
- **Growth:** `select count(*) from auth.users;` and `select count(*) from vinyl_records;`

### Changing the vision models

Set `VISION_MODELS` in Vercel to any comma-separated list of Claude model ids,
cheapest first, and redeploy; no code change. When someone taps **Wrong Album — Ask
Again** or sends a hint, the app uses `VISION_RETRY_MODELS` instead (default:
every model after the cheapest), tells the model which answers were wrong, and
says so if the model stands by one of them. Prices for cost logging live in
`lib/vision.js` (`MODEL_CATALOG`); other providers can be added there as one function.

### Adding a theme

1. Add an entry to `THEMES` in `lib/themes.js` (name, blurb, the third tab's
   label and icon, picker colours).
2. Add `app/themes/<id>.css` with every rule under `[data-theme="<id>"]`
   (copy `wood.css` as a starting point) and import it in `app/layout.tsx`.
3. Optional: give it its own browse screen. Write a component that takes the
   same props as `components/Nano.js` and `components/Deck.js`, register it in
   `BROWSERS` in `app/page.js`, and name it in the theme's `browse.screen`.

The choice is saved on the device (`localStorage`), applied before first
paint, and appears in Settings → Appearance automatically.
