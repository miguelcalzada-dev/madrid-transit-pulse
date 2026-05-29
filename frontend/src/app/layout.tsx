import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Cercanías Madrid — Monitor en Tiempo Real',
  description:
    'Sistema de monitorización en tiempo real de la red Cercanías Madrid (Renfe). ' +
    'Visualiza trenes, alertas e incidencias en un mapa interactivo con telemetría GTFS-RT.',
  keywords: ['Madrid', 'Cercanías', 'Renfe', 'tiempo real', 'GTFS', 'trenes', 'alertas', 'incidencias'],
  authors: [{ name: 'Madrid Transit Pulse' }],
  openGraph: {
    title: 'Cercanías Madrid — Monitor en Tiempo Real',
    description: 'Monitor en tiempo real de Cercanías Madrid con datos GTFS-RT de Renfe',
    type: 'website',
    locale: 'es_ES',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#ffffff',
};

import Navigation from '@/components/Navigation';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        {/* Fuentes de Google: Inter para UI y JetBrains Mono para IDs/códigos */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        {/* Leaflet CSS */}
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
      </head>
      <body style={{ display: 'flex', flexDirection: 'column', height: '100dvh', margin: 0, overflow: 'hidden' }}>
        <Navigation />
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {children}
        </div>
      </body>
    </html>
  );
}
