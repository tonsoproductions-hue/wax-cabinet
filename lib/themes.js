// Swappable looks for the whole app. A theme is three things:
//
//   1. an entry here: its name, the words it uses, and which browse screen
//      its third tab shows;
//   2. a stylesheet in app/themes/<id>.css whose rules all start with
//      [data-theme="<id>"] (the iPod look is the base in app/globals.css);
//   3. optionally its own browse component, registered in BROWSERS in
//      app/page.js (the iPod's click-wheel nano, the wood theme's turntable).
//
// To add a theme: add an entry, add the stylesheet and import it in
// app/layout.tsx. Everything else (Settings → Appearance, saving the choice,
// applying it before first paint) follows from this list. The hook that reads
// and changes the active theme is in lib/use-theme.js.
export const THEMES = {
  ipod: {
    id: 'ipod',
    name: 'Classic iPod',
    blurb: 'Pinstripes, glossy bars and a click wheel',
    // The third tab: what it's called, its icon (components/ui.js) and screen.
    browse: { label: 'Cover Flow', icon: 'coverflow', screen: 'nano' },
    // Browser chrome / home-screen status bar colour.
    themeColor: '#000000',
    // Three colours for the picker in Settings: bar, page, accent.
    swatch: ['#6d84a2', '#c5ccd4', '#2361de'],
  },
  wood: {
    id: 'wood',
    name: 'Wood Hi-Fi',
    blurb: 'Walnut, brass and a turntable',
    browse: { label: 'Turntable', icon: 'turntable', screen: 'deck' },
    themeColor: '#1e120a',
    swatch: ['#6b4223', '#efe4cf', '#c9973f'],
  },
}

// The look a new install opens with. Change this one line to launch with a
// different default (see "Review risks" in docs/LAUNCH.md).
export const DEFAULT_THEME = 'ipod'

export const THEME_STORAGE_KEY = 'vinyl-crate-theme'

// Runs in <head> before the page paints, so the saved look never flashes in
// late. Kept tiny and dependency-free; see app/layout.tsx.
export const THEME_BOOT_SCRIPT = `try{var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});document.documentElement.dataset.theme=${JSON.stringify(Object.keys(THEMES))}.indexOf(t)<0?${JSON.stringify(DEFAULT_THEME)}:t}catch(e){document.documentElement.dataset.theme=${JSON.stringify(DEFAULT_THEME)}}`
