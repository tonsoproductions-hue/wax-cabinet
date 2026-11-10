import type { Metadata, Viewport } from "next";
import { DEFAULT_THEME, THEMES, THEME_BOOT_SCRIPT } from "@/lib/themes";
import "./globals.css";
// One stylesheet per extra look; each only applies under its own
// [data-theme] attribute. See lib/themes.js.
import "./themes/wood.css";

export const metadata: Metadata = {
  title: "Vinyl Crate",
  description: "A vinyl collection registry: photograph a cover, match the pressing on Discogs, file it away.",
  // Added to the home screen, it opens full screen with a dark status bar.
  appleWebApp: { capable: true, title: "Vinyl Crate", statusBarStyle: "black-translucent" },
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
    <html lang="en" data-theme={DEFAULT_THEME} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
