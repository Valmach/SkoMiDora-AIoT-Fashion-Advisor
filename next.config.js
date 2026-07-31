/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable strict mode
  reactStrictMode: false,

  // FORCE DYNAMIC DEV BEHAVIOR & WHITELIST PRODUCTION DOMAINS
  experimental: {
    staleTimes: {
      dynamic: 0,
      static: 0,
    },
    serverActions: {
      allowedOrigins: [
        'styleai-footwear.web.app', 
        'styleai-footwear.firebaseapp.com',
        '*.hosted.app',
        '*.run.app'
      ]
    }
  },

  // Image Domains - Upgraded to wildcard and optimization bypassed
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**', // This wildcard allows all secure external images
      },
    ],
    unoptimized: true, // CRITICAL FIX: Bypasses Next.js compression timeouts for heavy renders
  },

  // REDIRECTS
  async redirects() {
    return [
      {
        source: '/recommendations',
        destination: '/outfit-recommendations',
        permanent: false,
      },
    ];
  },

  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
};

module.exports = nextConfig;