# Vinyl Crate

A vinyl collection app with two looks to choose from: an iPhone OS 3 / iPod
nano skin and a walnut hi-fi with a turntable. Photograph a
record cover; Claude identifies it, Discogs finds the pressing, tracklist and
price, and it's filed in your crate. Browse as an iPod-style list or in Cover
Flow on a click-wheel nano, shuffle to pick something to play, export to CSV
and share a read-only link.

Runs as a website on Vercel and as an iPhone app (Capacitor) from the same code.

## Develop

```bash
cp .env.example .env.local   # then fill in the keys
npm install
npm run dev                  # http://localhost:3000  (add ?demo for a sample crate)
```

| Command | What it does |
|---|---|
| `npm run dev` | website + API locally |
| `npm run lint` | ESLint |
| `npm run build` | production web build (what Vercel runs) |
| `npm run build:ios` | static bundle for the app, synced into `ios/` |
| `npm run ios:open` | open the Xcode project |

## Layout

| Path | |
|---|---|
| `app/page.js` | the app shell: tabs, auth state, data loading |
| `components/` | Albums list, Now Playing, Import, Settings, nano + Cover Flow |
| `app/api/*/route.server.js` | server routes (left out of the iOS build) |
| `lib/themes.js`, `app/themes/` | swappable looks (Classic iPod, Wood Hi-Fi); Settings → Appearance |
| `app/(info)/` | privacy policy, terms, account deletion and support pages |
| `lib/vision.js` | cover identification: cheapest model first, configurable via `VISION_MODELS` |
| `lib/native.js` | Capacitor bridges (haptics, share, files, sign-in links) with web fallbacks |
| `supabase/` | `schema.sql` for a fresh project, `migrations/` for the live one |
| `ios/` | Capacitor iOS project |
| `docs/LAUNCH.md` | App Store and scaling runbook |
| `docs/APP_PRIVACY.md` | App Store Connect privacy answers |
