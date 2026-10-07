import type { NextConfig } from "next";

// Two builds from one codebase:
// - web (default): the site plus API routes, deployed to Vercel.
// - ios (BUILD_TARGET=ios): a static export bundled into the Capacitor app.
//   API routes are named `route.server.js`, and leaving `server.js` out of
//   pageExtensions drops them from this build; the app calls the deployed API
//   at NEXT_PUBLIC_API_BASE instead.
const isIosBuild = process.env.BUILD_TARGET === "ios";

const nextConfig: NextConfig = isIosBuild
  ? {
      output: "export",
      pageExtensions: ["js", "jsx", "ts", "tsx"],
      images: { unoptimized: true },
      trailingSlash: true,
    }
  : {
      pageExtensions: ["js", "jsx", "ts", "tsx", "server.js"],
      async headers() {
        return [
          {
            // The iOS app (origin capacitor://localhost) calls these routes.
            // Auth travels in the Authorization header, never cookies, so a
            // wildcard origin is safe.
            source: "/api/:path*",
            headers: [
              { key: "Access-Control-Allow-Origin", value: "*" },
              { key: "Access-Control-Allow-Methods", value: "GET, POST, DELETE, OPTIONS" },
              { key: "Access-Control-Allow-Headers", value: "Authorization, Content-Type" },
              { key: "Access-Control-Max-Age", value: "86400" },
            ],
          },
        ];
      },
    };

export default nextConfig;
