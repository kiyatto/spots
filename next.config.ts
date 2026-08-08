import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "i.scdn.co",
      },
      {
        protocol: "https",
        hostname: "mosaic.scdn.co",
      },
      {
        protocol: "https",
        hostname: "image-cdn-ak.spotifycdn.com",
      },
      {
        protocol: "https",
        hostname: "image-cdn-fa.spotifycdn.com",
      },
    ],
  },
  // Spotify OAuth only allows 127.0.0.1 (not localhost) for local HTTP.
  // Keep the browser host consistent with AUTH_URL to avoid redirect_uri mismatches.
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "localhost:3000" }],
        destination: "http://127.0.0.1:3000/:path*",
        permanent: false,
      },
      {
        source: "/:path*",
        has: [{ type: "host", value: "localhost" }],
        destination: "http://127.0.0.1:3000/:path*",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
