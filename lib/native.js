// Bridges to the iOS app (Capacitor). Every helper falls back to the web
// behaviour, so the same components run on the website and in the app.
import { Capacitor } from '@capacitor/core'

export const isNative = () => Capacitor.isNativePlatform()

// Custom URL scheme registered in ios/App/App/Info.plist. Sign-in emails
// opened on the phone come back into the app through it.
export const APP_URL_SCHEME = 'vinylcrate'

export function authRedirectUrl() {
  return isNative() ? `${APP_URL_SCHEME}://auth-callback` : window.location.origin
}

// A light tick under the finger for the click wheel and Cover Flow.
export async function hapticTick() {
  if (!isNative()) return false
  const { Haptics } = await import('@capacitor/haptics')
  Haptics.selectionChanged().catch(() => {})
  return true
}

// Native share sheet in the app; Web Share or clipboard on the website.
// Resolves to 'shared', 'copied', 'cancelled' or 'failed'.
export async function shareLink({ title, text, url }) {
  if (isNative()) {
    const { Share } = await import('@capacitor/share')
    try {
      await Share.share({ title, text, url, dialogTitle: title })
      return 'shared'
    } catch {
      return 'cancelled'
    }
  }
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url })
      return 'shared'
    } catch (err) {
      if (err.name === 'AbortError') return 'cancelled'
    }
  }
  try {
    await navigator.clipboard.writeText(url)
    return 'copied'
  } catch {
    return 'failed'
  }
}

// Saves a text file: a download on the website; in the app (where WKWebView
// can't download blobs) write it to the cache and open the share sheet, which
// offers Save to Files, Mail, AirDrop and so on.
export async function saveTextFile(filename, text, mimeType) {
  if (isNative()) {
    const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem')
    const { Share } = await import('@capacitor/share')
    const { uri } = await Filesystem.writeFile({ path: filename, data: text, directory: Directory.Cache, encoding: Encoding.UTF8 })
    await Share.share({ title: filename, files: [uri] }).catch(() => {})
    return
  }
  // Phones can't save a download link once the site is on the home screen;
  // hand the file to the share sheet instead (Save to Files, AirDrop, Mail).
  const file = new File([text], filename, { type: mimeType })
  if (matchMedia('(pointer: coarse)').matches && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] })
      return
    } catch (err) {
      if (err.name === 'AbortError') return
    }
  }
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// App start-up: mark the page as native (CSS hides the fake status bar and
// pads for the notch), style the real status bar, and finish email sign-ins
// that arrive through the vinylcrate:// link.
export async function initNative(supabase) {
  if (!isNative()) return () => {}
  document.documentElement.classList.add('native')

  const { StatusBar, Style } = await import('@capacitor/status-bar')
  StatusBar.setStyle({ style: Style.Dark }).catch(() => {})

  const { App } = await import('@capacitor/app')
  const handle = await App.addListener('appUrlOpen', async ({ url }) => {
    if (!url.startsWith(`${APP_URL_SCHEME}://`)) return
    // Supabase puts the session in the fragment (implicit flow) or a ?code (PKCE).
    const parsed = new URL(url.replace('#', '?'))
    const accessToken = parsed.searchParams.get('access_token')
    const refreshToken = parsed.searchParams.get('refresh_token')
    const code = parsed.searchParams.get('code')
    if (accessToken && refreshToken) await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
    else if (code) await supabase.auth.exchangeCodeForSession(code)
  })
  return () => handle.remove()
}
