---
name: verify
description: Run Vinyl Crate in a browser and check what it shows, especially the status checklist, centre badge, alerts and error wording. Use to verify a change at the UI.
---

# Verify Vinyl Crate in a browser

No real Supabase, Claude or Discogs is needed. `drive.mjs` signs in with a fake
session, fakes every server reply with Playwright routes, and records every
status the page shows (including ones that flash by) via a MutationObserver.

## Run

```bash
# Build and serve. Placeholder Supabase values are enough; the build fails without them.
export NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=x
npx next build && npx next start -p 3125      # run in the background

OUT=$(mktemp -d)
python3 -I .claude/skills/verify/fixtures.py $OUT
node .claude/skills/verify/drive.mjs "$(npm root -g)/playwright/index.mjs" $OUT http://localhost:3125/
# Optional 4th argument filters scenarios by name, e.g. "export". SHOW_SEEN=1 prints everything seen.
```

Each scenario prints ✅/❌ with the exact text expected; screenshots land in `$OUT`.

## Gotchas

- Playwright is installed globally, not in the project: import it by path as above.
- `ctx.setOffline(true)` does not stop routes you fulfil yourself. Abort the route too.
- Timeouts (Claude 45s, Discogs 15s) are reached with `page.clock.install()` + `fastForward`.
- The fake session lives in localStorage key `sb-example-auth-token` (project ref `example`).
- The Now Playing screen slides in; wait ~700ms before screenshotting it.
- Don't use `next dev` unless you mean to: it rewrites the block in AGENTS.md.
