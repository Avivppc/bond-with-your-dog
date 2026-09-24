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
