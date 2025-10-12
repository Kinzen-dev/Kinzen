/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  output: 'standalone',
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
  images: {
    domains: ['localhost'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  webpack: (config, { isServer }) => {
    // Fix for React 19 compatibility with Three.js/WebGL
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }
    
    // Handle WebGL/Three.js modules properly
    config.module.rules.push({
      test: /\.(glb|gltf)$/,
      type: 'asset/resource',
    });

    return config;
  },
  // Ensure proper client-side rendering for WebGL components
  transpilePackages: ['@react-three/fiber', '@react-three/drei', 'three'],
};

module.exports = nextConfig;

