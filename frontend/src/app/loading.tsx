export default function Loading() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100%', gap: '1rem',
      padding: '2rem', color: 'var(--text-muted)',
    }}>
      <div className="mtp-map-loading-spinner" />
      <p style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '0.65rem',
        fontWeight: 700,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
      }}>Cargando...</p>
    </div>
  );
}
