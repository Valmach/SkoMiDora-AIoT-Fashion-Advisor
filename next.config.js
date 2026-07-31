const { execSync } = require('child_process');

// Resolve the current git commit SHA at build time so the deployed app can
// report which commit is live (see /api/health). Firebase App Hosting's
// build environment does not reliably expose a commit-SHA env var, so we
// shell out to git directly and fall back to 'unknown' if that fails (e.g.
// a shallow checkout without .git, or a local build outside a git repo).
function resolveCommitSha() {
  if (process.env.NEXT_PUBLIC_COMMIT_SHA) {
    return process.env.NEXT_PUBLIC_COMMIT_SHA;
  }
  try {
    return execSync('git rev-parse --short HEAD').toString().trim();
  } catch {
    return 'unknown';
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_COMMIT_SHA: resolveCommitSha(),
  },

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
  // Reverted to true: the App Hosting build container OOM'd running a full
  // project-wide `tsc` type-check during `next build` (JavaScript heap out
  // of memory around ~2GB, right after the ESLint pass completed cleanly).
  // `tsc --noEmit` run standalone is clean and stays a good local check -
  // this is specifically about memory available to Next's own build-time
  // type-check step in this build environment. Re-enable once that's
  // fixed (e.g. a higher build-time NODE_OPTIONS max-old-space-size, or a
  // beefier Cloud Build machine type) and verified with a real deploy.
  typescript: {
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;