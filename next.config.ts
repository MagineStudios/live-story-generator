import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    /* config options here */
    ignoreDuringBuilds: true,
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'res.cloudinary.com',
                port: '',
                pathname: '/**',
            },
        ],
    },
};

export default nextConfig;
