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
      textAlign: 'center', color: 'var(--text-muted)',
    }}>
      <div style={{
        display: 'grid', placeItems: 'center',
        width: 60, height: 60, marginBottom: '1rem',
        background: 'var(--color-alta-bg)', color: 'var(--color-alta)',
        border: '3px solid #111111', boxShadow: '4px 4px 0 #111111',
      }}>
        <AlertTriangle size={28} />
      </div>
      <h2 style={{
        fontFamily: 'var(--font-heading)',
        fontSize: '1.5rem',
        textTransform: 'uppercase',
        color: 'var(--text-primary)',
        margin: '0 0 0.5rem',
      }}>
        Algo salió mal
      </h2>
      <p style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '0.65rem',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        margin: '0 0 1.5rem',
        maxWidth: 400,
      }}>
        {error.message || 'Error inesperado en la aplicación.'}
      </p>
      <button
        onClick={reset}
        style={{
          padding: '0.7rem 1.2rem', border: '3px solid #111111',
          background: 'var(--accent-primary)', color: '#ffffff',
          boxShadow: '4px 4px 0 #111111', cursor: 'pointer',
          fontFamily: 'var(--font-mono)', fontSize: '0.7rem',
          fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
        }}
      >
        Reintentar
      </button>
    </div>
  );
}
