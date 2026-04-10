import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Allow JSON imports (translation files) from the src directory
  // Already supported natively in Next.js 15, listed for documentation clarity.

  // Strict-mode for catching React 18/19 double-invoke issues early
  reactStrictMode: true,

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
