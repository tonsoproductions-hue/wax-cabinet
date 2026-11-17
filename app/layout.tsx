import type { Metadata, Viewport } from "next";
import { DEFAULT_THEME, THEMES, THEME_BOOT_SCRIPT } from "@/lib/themes";
import { LANDING_ENABLED, LANDING_BOOT_SCRIPT } from "@/lib/landing";
import "./globals.css";
// One stylesheet per extra look; each only applies under its own
// [data-theme] attribute. See lib/themes.js.
import "./themes/wood.css";
// The public home page (components/Landing.js).
import "./landing.css";

const TITLE = "Vinyl Sleeve · Snap a record cover, build your collection";
const DESCRIPTION = "Photograph any record cover and Vinyl Sleeve names it, finds the exact pressing on Discogs and files it in your collection. Free, no barcode needed, works on any phone or computer.";

export const metadata: Metadata = {
  // Share links and search results need absolute addresses for the icon.
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: { title: TITLE, description: DESCRIPTION, siteName: "Vinyl Sleeve", type: "website", images: ["/icon-512.png"] },
  twitter: { card: "summary", title: TITLE, description: DESCRIPTION, images: ["/icon-512.png"] },
  // Added to the home screen, it opens full screen with a dark status bar.
  appleWebApp: { capable: true, title: "Vinyl Sleeve", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: THEMES[DEFAULT_THEME].themeColor,
  // Draw under the notch and home indicator; globals.css pads with safe-area insets.
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // The boot script sets data-theme from the saved choice before first
    // paint, so the attribute can differ from what the server rendered.
    // The landing boot script forwards visits to / that are meant for the app
    // on to /app (lib/landing.js).
    <html lang="en" data-theme={DEFAULT_THEME} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
        {LANDING_ENABLED && <script dangerouslySetInnerHTML={{ __html: LANDING_BOOT_SCRIPT }} />}
      </head>
      <body>{children}</body>
    </html>
  );
}
