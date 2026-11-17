import VinylApp from '@/components/VinylApp'
import Landing from '@/components/Landing'
import { LANDING_ENABLED } from '@/lib/landing'

// The website's home page. The app itself is at /app. The iOS build has no
// home page, so it opens straight into the app.
export default function Home() {
  return LANDING_ENABLED ? <Landing /> : <VinylApp />
}
