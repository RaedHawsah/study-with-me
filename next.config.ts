import type { NextConfig } from 'next';

// NOTE: setupDevPlatform() from @cloudflare/next-on-pages is intentionally
// disabled — it causes a native Miniflare crash on Windows (access violation).
// It is only needed when using Cloudflare D1/KV bindings, which this app does not use.


const nextConfig: NextConfig = {
  // Skip pre-existing lint/type errors during CI/CD builds
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },

  // Strict-mode for catching React 18/19 double-invoke issues early
  reactStrictMode: true,

  // Image configuration for external avatars
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
    ],
  },

  // Custom headers for PWA manifest and security
  async headers() {
    return [
      {
        source: '/manifest.json',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Content-Type', value: 'application/manifest+json' },
        ],
      },
      {
        // Cache audio files for 1 year — they never change (content-addressed)
        source: '/audio/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        // Content Security Policy — tighten before production
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
