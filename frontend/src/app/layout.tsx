import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://miguelcalzada.com'),
  alternates: { canonical: 'https://miguelcalzada.com/madrid-transit' },
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
  themeColor: '#eae8e3',
};

import Navigation from '@/components/Navigation';
import ConsoleSuppressor from '@/components/ConsoleSuppressor';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Space+Grotesk:wght@300;400;500;600;700&family=Space+Mono:ital,wght@0,400;0,700;1,400&display=swap"
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
      <body>
        <div className="mtp-shell">
          <ConsoleSuppressor />
          <Navigation />
          <div className="mtp-shell__main">
            {children}
          </div>
          <footer className="mtp-shell__footer">
            Datos provistos por <strong>Renfe Open Data</strong> y <strong>CRTM</strong>. Aplicación no oficial.
          </footer>
        </div>

        {/* Volver al portfolio (miguelcalzada.com) */}
        <a
          className="mc-home"
          href="https://miguelcalzada.com/"
          aria-label="Volver al portfolio de Miguel Calzada"
        >
          <span className="mc-home__mark" aria-hidden="true">MC</span>
          <span className="mc-home__text mc-home__text--long">Volver a miguelcalzada.com</span>
          <span className="mc-home__text mc-home__text--short">Portfolio</span>
        </a>
      </body>
    </html>
  );
}
