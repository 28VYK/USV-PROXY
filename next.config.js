/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow legacy SSL connections in API routes
  experimental: {
    serverComponentsExternalPackages: ['https', 'tls']
  },
  
  // Rewrite PeopleSoft resource paths to our asset proxy
  async rewrites() {
    return [
      // Cache servlet paths
      {
        source: '/cs/:path*',
        destination: '/api/asset/cs/:path*',
      },
      // Portal paths for assets
      {
        source: '/psp/:path*',
        destination: '/api/asset/psp/:path*',
      },
      {
        source: '/psc/:path*',
        destination: '/api/asset/psc/:path*',
      },
      // PT90SYS paths (images, CSS, etc)
      {
        source: '/PT90SYS/:path*',
        destination: '/api/asset/PT90SYS/:path*',
      },
    ];
  },
}

module.exports = nextConfig
