/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    const api = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
    return {
      fallback: [
        { source: '/api/:path*', destination: `${api}/api/:path*` },
      ],
    };
  },
};

export default nextConfig;
