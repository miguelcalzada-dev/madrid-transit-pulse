import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100%', padding: '2rem',
      textAlign: 'center', color: '#64748b',
    }}>
      <div style={{ fontSize: '3rem', fontWeight: 800, color: '#e2e8f0', marginBottom: '0.5rem' }}>
        404
      </div>
      <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.5rem' }}>
        Página no encontrada
      </h2>
      <p style={{ fontSize: '0.8rem', margin: '0 0 1.5rem' }}>
        Esta ruta no existe en el monitor de Cercanías Madrid.
      </p>
      <Link
        href="/"
        style={{
          padding: '0.6rem 1.2rem', borderRadius: 8, border: 'none',
          background: '#2563eb', color: '#fff', fontWeight: 700, fontSize: '0.8rem',
          textDecoration: 'none',
        }}
      >
        Volver al Dashboard
      </Link>
    </div>
  );
}
