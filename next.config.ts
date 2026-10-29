import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Greet the World's camera models are large and rarely change, so laptops keep them for a month and later classes load them locally.
        source: "/lessons/lesson-04/greet-the-world/mediapipe/:file*",
        headers: [{ key: "Cache-Control", value: "public, max-age=2592000, stale-while-revalidate=86400" }],
      },
    ];
  },
};

export default nextConfig;
