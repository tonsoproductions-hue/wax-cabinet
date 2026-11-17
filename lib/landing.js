// The website's home page is components/Landing.js at /, and the app is at
// /app. The iOS build has no home page: its / is the app.

// The iOS build is the only one that sets NEXT_PUBLIC_API_BASE
// (scripts/build-ios.sh).
export const LANDING_ENABLED = !process.env.NEXT_PUBLIC_API_BASE

// Some visits to / are meant for the app: share links and the demo from
// before the app had its own page (/?c=, /?demo), sign-in links from the
// email (/?code=, #access_token), and the home-screen app saved before its
// start page became /app. This runs in <head> on every page and sends those
// on to /app with the same query and hash, hiding the page so the home page
// never flashes.
export const LANDING_BOOT_SCRIPT = `try{var l=location;if(l.pathname==='/'&&(/[?&](c|demo|code|signin)(=|&|$)/.test(l.search)||/access_token|error_description/.test(l.hash)||matchMedia('(display-mode: standalone)').matches||navigator.standalone)){document.documentElement.style.visibility='hidden';l.replace('/app'+l.search+l.hash)}}catch(e){}`
