'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { useTransitData } from '@/hooks/useTransitData';

const LiveMap = dynamic(() => import('@/components/map/LiveMap'), {
  ssr: false,
  loading: () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b' }}>
      <div className="mtp-map-loading-spinner" />
      <p>Cargando mapa de alta resolución...</p>
    </div>
  ),
});

export default function MapaPage() {
  const { alertas, vehiculos } = useTransitData();
  const [vehiculoFocal, setVehiculoFocal] = useState<string | null>(null);

  return (
    <main style={{ height: '100%', width: '100%', position: 'relative' }}>
      <LiveMap
        vehiculos={vehiculos}
        alertas={alertas}
        vehiculoFocal={vehiculoFocal}
      />
      {/* Floating status or simple UI could go here */}
    </main>
  );
}
