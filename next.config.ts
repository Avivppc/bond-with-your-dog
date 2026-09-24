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
      { source: "/chapter/movement", destination: "/chapter/moves", permanent: true },
      { source: "/chapter/masterpiece", destination: "/chapter/lets-dance", permanent: true },
    ];
  },
};

export default nextConfig;
