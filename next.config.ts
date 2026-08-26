import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  redirects: async () => [
    {
      source: "/:path*",
      has: [{ type: "host", value: "sama-scan-riyadh.vercel.app" }],
      destination: "https://samascan.vercel.app/:path*",
      permanent: true,
    },
    {
      source: "/:path*",
      has: [
        {
          type: "host",
          value: "sama-scan-riyadh-moqawel1215-3361s-projects.vercel.app",
        },
      ],
      destination: "https://samascan.vercel.app/:path*",
      permanent: true,
    },
    {
      source: "/:path*",
      has: [
        {
          type: "host",
          value: "samascan-moqawel1215-3361s-projects.vercel.app",
        },
      ],
      destination: "https://samascan.vercel.app/:path*",
      permanent: true,
    },
  ],
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "X-Frame-Options", value: "SAMEORIGIN" },
        {
          key: "Permissions-Policy",
          value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
        },
      ],
    },
  ],
};

export default nextConfig;
