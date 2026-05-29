'use client';

import { useState } from 'react';
import { Filter, X } from 'lucide-react';

const LINE_ORDER = ['C1', 'C2', 'C3', 'C4', 'C5', 'C7', 'C8', 'C9', 'C10'];

const LINE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  C1:  { bg: '#fef2f2', text: '#b91c1c', border: '#fca5a5' },
  C2:  { bg: '#eff6ff', text: '#1d4ed8', border: '#93c5fd' },
  C3:  { bg: '#fff7ed', text: '#c2410c', border: '#fdba74' },
  C4:  { bg: '#f0fdf4', text: '#15803d', border: '#86efac' },
  C5:  { bg: '#faf5ff', text: '#7e22ce', border: '#d8b4fe' },
  C7:  { bg: '#fef2f2', text: '#991b1b', border: '#fca5a5' },
  C8:  { bg: '#ecfdf5', text: '#065f46', border: '#6ee7b7' },
  C9:  { bg: '#f8fafc', text: '#475569', border: '#cbd5e1' },
  C10: { bg: '#eff6ff', text: '#1e40af', border: '#93c5fd' },
};

interface GlobalFiltersProps {
  activeFilter: string;
  onFilterChange: (lineId: string) => void;
  trainsPerLine: Record<string, number>;
  alertsPerLine: Record<string, number>;
}

export default function GlobalFilters({ activeFilter, onFilterChange, trainsPerLine, alertsPerLine }: GlobalFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const availableLines = LINE_ORDER.filter(l => (trainsPerLine[l] ?? 0) > 0);

  const totalTrains = Object.values(trainsPerLine).reduce((a, b) => a + b, 0);

  const renderChips = (isMobileGrid: boolean = false) => {
    return (
      <>
        <button
          className={`filter-chip ${activeFilter === 'ALL' ? 'filter-chip--active' : ''}`}
          onClick={() => { onFilterChange('ALL'); setIsOpen(false); }}
          style={isMobileGrid ? { gridColumn: '1 / -1' } : {}}
        >
          🚆 Todas las líneas
          <span style={{ background: 'rgba(0,0,0,0.12)', borderRadius: '999px', padding: '0 0.3rem', fontSize: '0.58rem' }}>
            {totalTrains}
          </span>
        </button>

        {availableLines.map(lineId => {
          const lc = LINE_COLORS[lineId] || { bg: '#f8fafc', text: '#475569', border: '#e2e8f0' };
          const active = activeFilter === lineId;
          const trainCount = trainsPerLine[lineId] || 0;
          const alertCount = alertsPerLine[lineId] || 0;
          return (
            <button
              key={lineId}
              className={`filter-chip ${active ? 'filter-chip--active' : ''}`}
              style={!active ? {
                background: lc.bg,
                borderColor: lc.border,
                color: lc.text,
              } : {
                background: lc.text,
                borderColor: lc.text,
                color: '#fff',
                boxShadow: `0 1px 3px ${lc.text}40`,
              }}
              onClick={() => { onFilterChange(lineId); setIsOpen(false); }}
            >
              {lineId}
              <span style={{
                background: 'rgba(0,0,0,0.12)',
                borderRadius: '999px',
                padding: '0 0.3rem',
                fontSize: '0.58rem',
              }}>
                {trainCount}
              </span>
              {alertCount > 0 && (
                <span style={{
                  background: '#dc2626',
                  color: '#fff',
                  borderRadius: '999px',
                  padding: '0 0.3rem',
                  fontSize: '0.55rem',
                  fontWeight: 700,
                  marginLeft: '0.1rem',
                }}>
                  ⚠{alertCount}
                </span>
              )}
            </button>
          );
        })}
      </>
    );
  };

  return (
    <>
      {/* Desktop Version */}
      <div className="global-filters desktop-flex">
        <span className="global-filters__label">Filtrar por línea:</span>
        {renderChips(false)}
      </div>

      {/* Mobile Version - Floating Button */}
      <div className="mobile-only">
        <button className="mobile-filter-btn" onClick={() => setIsOpen(true)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={18} color="#475569" />
            <span>Filtro de Líneas</span>
          </div>
          <span style={{ color: '#2563eb' }}>
            {activeFilter === 'ALL' ? 'Todas' : activeFilter}
          </span>
        </button>
      </div>

      {/* Mobile Bottom Sheet Overlay */}
      {isOpen && (
        <>
          <div className="mobile-filter-sheet-bg" onClick={() => setIsOpen(false)} />
          <div className="mobile-filter-sheet">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>Seleccionar Línea</span>
              <button 
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', padding: '0.5rem', display: 'flex' }}
                onClick={() => setIsOpen(false)}
              >
                <X size={20} color="#475569" />
              </button>
            </div>
            <div className="mobile-filter-sheet-grid">
              {renderChips(true)}
            </div>
          </div>
        </>
      )}
    </>
  );
}
