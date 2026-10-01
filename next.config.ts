import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "static.wixstatic.com",
      },
      {
        protocol: "https",
        hostname: "contribution.usercontent.google.com",
      },
    ],
  },
  // The Kajabi import copies lesson downloads saved in the repo; bundle them with that route.
  outputFileTracingIncludes: {
    "/admin/courses/import-kajabi": ["./data/kajabi/files/**"],
  },
  // PostHog's API paths end in a slash; without this Next would redirect them away.
  skipTrailingSlashRedirect: true,
  // Reverse proxy for PostHog (US cloud). The path must match POSTHOG_PROXY_PATH
  // in src/instrumentation-client.ts.
  async rewrites() {
    return [
      { source: "/tails/static/:path*", destination: "https://us-assets.i.posthog.com/static/:path*" },
      { source: "/tails/array/:path*", destination: "https://us-assets.i.posthog.com/array/:path*" },
      { source: "/tails/:path*", destination: "https://us.i.posthog.com/:path*" },
    ];
  },
  async redirects() {
    return [
      // Chapter renames (Sept 2026)
      { source: "/chapter/movement", destination: "/chapter/moves", permanent: true },
      { source: "/chapter/masterpiece", destination: "/chapter/lets-dance", permanent: true },
      // Legacy "Keta Tov" pages removed from the site
      { source: "/enroll", destination: "/signup", permanent: true },
      { source: "/courses/kinetic-basics", destination: "/courses", permanent: true },
    ];
  },
};

export default nextConfig;
