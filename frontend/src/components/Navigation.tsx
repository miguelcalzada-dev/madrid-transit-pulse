'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { LayoutDashboard, Map as MapIcon, AlertTriangle, Train, Menu, X, MapPin } from 'lucide-react';

export default function Navigation() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const navLinks = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/estaciones', label: 'Estaciones', icon: MapPin },
    { href: '/mapa', label: 'Mapa en Vivo', icon: MapIcon },
    { href: '/alertas', label: 'Incidencias', icon: AlertTriangle },
  ];

  return (
    <>
      <nav className="nav-header" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 1.5rem',
        height: '56px',
        background: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        zIndex: 1000,
        flexShrink: 0,
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{
            width: '30px', height: '30px',
            background: '#dc2626',
            borderRadius: '8px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Train size={16} color="#fff" />
          </div>
          <div className="nav-brand-text">
            <div style={{ fontSize: '0.92rem', fontWeight: 700, letterSpacing: '-0.02em', color: '#0f172a', lineHeight: 1 }}>
              Cercanías Madrid
            </div>
            <div style={{ fontSize: '0.58rem', color: '#94a3b8', fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Monitor en tiempo real
            </div>
          </div>
        </div>

        {/* Desktop Nav links */}
        <div className="desktop-flex" style={{ gap: '0.25rem' }}>
          {navLinks.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className="nav-link-btn"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.4rem 0.9rem',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: active ? '#2563eb' : '#475569',
                  background: active ? '#eff6ff' : 'transparent',
                  border: '1px solid',
                  borderColor: active ? '#bfdbfe' : 'transparent',
                  transition: 'all 0.15s',
                  textDecoration: 'none',
                }}
              >
                <Icon size={14} />
                <span className="nav-link-text">{label}</span>
              </Link>
            );
          })}
        </div>

        {/* Mobile Hamburger Button */}
        <button 
          className="mobile-flex" 
          style={{ background: 'none', border: 'none', color: '#0f172a', padding: '0.4rem' }}
          onClick={() => setIsOpen(true)}
        >
          <Menu size={24} />
        </button>
      </nav>

      {/* Mobile Full Screen Menu Overlay */}
      {isOpen && (
        <div className="mobile-menu-overlay">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{
                width: '30px', height: '30px',
                background: '#dc2626',
                borderRadius: '8px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Train size={16} color="#fff" />
              </div>
              <div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>Cercanías Madrid</div>
                <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>MONITOR EN TIEMPO REAL</div>
              </div>
            </div>
            <button 
              style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', padding: '0.5rem', display: 'flex' }}
              onClick={() => setIsOpen(false)}
            >
              <X size={20} color="#475569" />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {navLinks.map(({ href, label, icon: Icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className="nav-link-btn"
                  onClick={() => setIsOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.8rem',
                    padding: '1rem',
                    borderRadius: '12px',
                    fontSize: '1.1rem',
                    fontWeight: 700,
                    color: active ? '#2563eb' : '#475569',
                    background: active ? '#eff6ff' : '#f8fafc',
                    border: '2px solid',
                    borderColor: active ? '#bfdbfe' : 'transparent',
                    textDecoration: 'none',
                  }}
                >
                  <Icon size={20} />
                  <span className="nav-link-text">{label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
