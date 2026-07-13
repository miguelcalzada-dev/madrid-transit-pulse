'use client';

import { AlertTriangle } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100%', padding: '2rem',
      textAlign: 'center', color: '#64748b',
    }}>
      <AlertTriangle size={40} color="#dc2626" style={{ marginBottom: '1rem' }} />
      <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.5rem' }}>
        Algo salió mal
      </h2>
      <p style={{ fontSize: '0.8rem', margin: '0 0 1.5rem', maxWidth: 400 }}>
        {error.message || 'Error inesperado en la aplicación.'}
      </p>
      <button
        onClick={reset}
        style={{
          padding: '0.6rem 1.2rem', borderRadius: 8, border: 'none',
          background: '#2563eb', color: '#fff', fontWeight: 700, fontSize: '0.8rem',
          cursor: 'pointer',
        }}
      >
        Reintentar
      </button>
    </div>
  );
}
