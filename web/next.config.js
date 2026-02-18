const path = require('path');

const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [],
  },
  outputFileTracingRoot: path.join(__dirname),
}

module.exports = nextConfig
