/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Enable SWC minification
  swcMinify: true,
  // Configure images if needed
  images: {
    domains: [],
  },
}

module.exports = nextConfig
