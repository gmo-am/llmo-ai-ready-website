/** @type {import('next').NextConfig} */
const nextConfig = {
  // Cloud Run向けに軽量な実行物を作る
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*',
        pathname: '/**',
      },
    ],
  },
}

module.exports = nextConfig
