#!/usr/bin/env bash
# Builds the static web bundle for the iOS app and copies it into the Xcode
# project. Supabase URL and anon key come from .env.local (or the environment).
#   NEXT_PUBLIC_API_BASE   deployed site that serves /api/* (default below)
#   NEXT_PUBLIC_SITE_URL   public site for share links, privacy and support
set -euo pipefail
cd "$(dirname "$0")/.."

export BUILD_TARGET=ios
export NEXT_PUBLIC_API_BASE="${NEXT_PUBLIC_API_BASE:-https://wax-cabinet.vercel.app}"
export NEXT_PUBLIC_SITE_URL="${NEXT_PUBLIC_SITE_URL:-$NEXT_PUBLIC_API_BASE}"
# The app opens on its welcome screen, not the website's featured crate.
export NEXT_PUBLIC_FEATURED_OWNER=

rm -rf out
npx next build
npx cap sync ios
echo "iOS bundle ready. Open Xcode with: npm run ios:open"
