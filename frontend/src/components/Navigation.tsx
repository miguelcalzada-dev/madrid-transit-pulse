'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Map as MapIcon, AlertTriangle, Train } from 'lucide-react';

export default function Navigation() {
  const pathname = usePathname();

  const navLinks = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/mapa', label: 'Mapa en Vivo', icon: MapIcon },
    { href: '/alertas', label: 'Incidencias', icon: AlertTriangle },
  ];

  return (
    <nav style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 1.5rem',
      height: '56px',
      background: '#ffffff',
      borderBottom: '1px solid #e2e8f0',
      boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
      position: 'sticky',
      top: 0,
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
        <div>
          <div style={{ fontSize: '0.92rem', fontWeight: 700, letterSpacing: '-0.02em', color: '#0f172a', lineHeight: 1 }}>
            Cercanías Madrid
          </div>
          <div style={{ fontSize: '0.58rem', color: '#94a3b8', fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Monitor en tiempo real
          </div>
        </div>
      </div>

      {/* Nav links */}
      <div style={{ display: 'flex', gap: '0.25rem' }}>
        {navLinks.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
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
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
