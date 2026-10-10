import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vinyl Crate",
  description: "A vinyl collection registry: photograph a cover, match the pressing on Discogs, file it away.",
  // Added to the home screen, it opens full screen with a dark status bar.
  appleWebApp: { capable: true, title: "Vinyl Crate", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  // Draw under the notch and home indicator; globals.css pads with safe-area insets.
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
