import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "elysia",
    "@elysiajs/cors",
    "@elysiajs/bearer",
    "dockerode",
    "docker-modem",
    "ssh2",
    "ioredis",
    "bullmq",
    "ws",
  ],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
