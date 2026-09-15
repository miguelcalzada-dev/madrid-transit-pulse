/** @type {import('next').NextConfig} */
const nextConfig = {
  // Se sirve bajo https://miguelcalzada.com/madrid-transit
  basePath: '/madrid-transit',

  // Habilita el App Router de Next.js 14
  experimental: {},
  reactStrictMode: false,

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

  // Las URLs antiguas (madrid-transit-pulse.vercel.app) redirigen al dominio nuevo.
  // basePath: false evita el prefijo para no interferir con el proxy del portal.
  async redirects() {
    return [
      { source: '/', destination: 'https://miguelcalzada.com/madrid-transit', permanent: true, basePath: false },
      { source: '/estaciones', destination: 'https://miguelcalzada.com/madrid-transit/estaciones', permanent: true, basePath: false },
      { source: '/alertas', destination: 'https://miguelcalzada.com/madrid-transit/alertas', permanent: true, basePath: false },
    ];
  },
};

module.exports = nextConfig;
