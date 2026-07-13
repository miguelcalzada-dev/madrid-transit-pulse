export default function Loading() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100%', gap: '1rem',
      padding: '2rem', color: '#94a3b8',
    }}>
      <div className="mtp-map-loading-spinner" />
      <p style={{ fontSize: '0.8rem', fontWeight: 500 }}>Cargando...</p>
    </div>
  );
}
