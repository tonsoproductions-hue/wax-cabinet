// The public home page (components/Landing.js) greets signed-out visitors to
// the website. Signed-in users, share links, the demo, sign-in links, the
// document pages and the iOS app all skip it and open the app as before.

// The iOS build is the only one that sets NEXT_PUBLIC_API_BASE
// (scripts/build-ios.sh), and the app never shows the home page.
export const LANDING_ENABLED = !process.env.NEXT_PUBLIC_API_BASE

// The server can't know who is visiting, so it always renders the home page
// and marks <html data-landing>. This runs in <head> before the page paints
// (like THEME_BOOT_SCRIPT) and drops the mark for visitors who should get the
// app; app/landing.css keys off the mark, so the home page never flashes.
// It also notes the decision on window, where app/page.js reads it with
// skipLanding() and keeps the mark in step from then on.
export const LANDING_BOOT_SCRIPT = `try{var l=location,k=Object.keys(localStorage).some(function(k){return /^sb-.*-auth-token$/.test(k)});if(l.pathname!=='/'||/[?&](c|demo|code)(=|&|$)/.test(l.search)||/access_token|error_description/.test(l.hash)||k){window.__skipLanding=true;document.documentElement.removeAttribute('data-landing')}}catch(e){}`

// What the boot script decided for this visit. Browser only.
export const skipLanding = () => !!window.__skipLanding
