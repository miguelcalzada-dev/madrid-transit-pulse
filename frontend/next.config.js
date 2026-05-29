/** @type {import('next').NextConfig} */
const nextConfig = {
  // Habilita el App Router de Next.js 14
  experimental: {},

  // Configuración de variables de entorno públicas (accesibles en el cliente)
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001',
    NEXT_PUBLIC_MAP_CENTER_LAT: process.env.NEXT_PUBLIC_MAP_CENTER_LAT || '40.4168',
    NEXT_PUBLIC_MAP_CENTER_LON: process.env.NEXT_PUBLIC_MAP_CENTER_LON || '-3.7038',
  },

  // Optimización de imágenes
  images: {
    domains: [],
  },
};

module.exports = nextConfig;
