import type { MetadataRoute } from "next";

// Lets phones install Vinyl Crate to the home screen as a full-screen app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Vinyl Crate",
    short_name: "Vinyl Crate",
    description: "A vinyl collection registry: photograph a cover, match the pressing on Discogs, file it away.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#000000",
    theme_color: "#000000",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
