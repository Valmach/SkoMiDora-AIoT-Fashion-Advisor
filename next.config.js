/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true, 
    remotePatterns: [
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com', pathname: '/**' },
      { protocol: 'https', hostname: 'styleai-footwear.appspot.com', pathname: '/**' },
      { protocol: 'https', hostname: 'storage.googleapis.com', pathname: '/**' },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb', 
    },
  },
  // ✅ ADD THIS: Prevents unused variable warnings from killing your build
  eslint: {
    ignoreDuringBuilds: true,
  },
  // ✅ ADD THIS: Push through minor TS issues if needed
  typescript: {
    ignoreBuildErrors: false, // Set to true only if you want to force a broken build through
  },
  reactStrictMode: true,
};

module.exports = nextConfig;