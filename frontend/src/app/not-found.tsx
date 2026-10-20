import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100%', padding: '2rem',
      textAlign: 'center', color: 'var(--text-muted)',
    }}>
      <div style={{
        fontFamily: 'var(--font-heading)',
        fontSize: 'clamp(4rem, 12vw, 7rem)',
        lineHeight: 0.9,
        color: 'var(--accent-primary)',
        marginBottom: '0.5rem',
        WebkitTextStroke: '2px #111111',
      }}>
        404
      </div>
      <h2 style={{
        fontFamily: 'var(--font-heading)',
        fontSize: '1.5rem',
        textTransform: 'uppercase',
        color: 'var(--text-primary)',
        margin: '0 0 0.5rem',
      }}>
        Página no encontrada
      </h2>
      <p style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '0.65rem',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        margin: '0 0 1.5rem',
      }}>
        Esta ruta no existe en el monitor de Cercanías Madrid.
      </p>
      <Link
        href="/"
        className="btn-primary"
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          padding: '0.7rem 1.2rem', border: '3px solid #111111',
          background: 'var(--accent-primary)', color: '#ffffff',
          boxShadow: '4px 4px 0 #111111', textDecoration: 'none',
          fontFamily: 'var(--font-mono)', fontSize: '0.7rem',
          fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
        }}
      >
        Volver al Dashboard
      </Link>
    </div>
  );
}
