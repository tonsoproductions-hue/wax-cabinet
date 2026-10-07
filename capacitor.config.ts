import type { CapacitorConfig } from '@capacitor/cli';

// The iOS app bundles the static export in out/ (npm run build:ios) and calls
// the API on the web deployment. See docs/LAUNCH.md.
const config: CapacitorConfig = {
  appId: 'com.tonsoproductions.vinylcrate',
  appName: 'Vinyl Crate',
  webDir: 'out',
  ios: {
    // Pages handle the notch themselves (viewport-fit=cover + safe-area CSS).
    contentInset: 'never',
    backgroundColor: '#000000',
    limitsNavigationsToAppBoundDomains: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 600,
      backgroundColor: '#000000',
      showSpinner: false,
    },
  },
};

export default config;
