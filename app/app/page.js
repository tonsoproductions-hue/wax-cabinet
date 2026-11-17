import VinylApp from '@/components/VinylApp'

// The app on the website. The home page (app/page.js) links here, and
// forwards old share links and sign-in links here (lib/landing.js).
export const metadata = { title: 'Vinyl Sleeve' }

export default function AppPage() {
  return <VinylApp />
}
