'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { LayoutDashboard, AlertTriangle, Train, Menu, X, MapPin, Code2 } from 'lucide-react';

const REPO_URL = 'https://github.com/miguelcalzada-dev/madrid-transit-pulse';

export default function Navigation() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const navLinks = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/estaciones', label: 'Estaciones', icon: MapPin },
    { href: '/alertas', label: 'Incidencias', icon: AlertTriangle },
  ];

  return (
    <>
      <header className="mtp-navbar">
        <nav className="mtp-navbar__inner" aria-label="NavegaciÃ³n principal">
          {/* Brand */}
          <Link prefetch={false} href="/" className="mtp-brand" aria-label="CercanÃ­as Madrid, inicio">
            <span className="mtp-brand__mark">
              <Train size={18} strokeWidth={2.5} />
            </span>
            <span>
              <span className="mtp-brand__title">
                CercanÃ­as<span>.</span>
              </span>
              <span className="mtp-brand__sub">Madrid Â· Monitor en tiempo real</span>
            </span>
          </Link>

          {/* Desktop Nav links */}
          <div className="mtp-navlinks">
            {navLinks.map(({ href, label, icon: Icon }) => {
              const active = pathname === href;
              return (
                <Link prefetch={false}
                  key={href}
                  href={href}
                  className={`mtp-navlink${active ? ' is-active' : ''}`}
                >
                  <Icon size={13} strokeWidth={2.5} />
                  <span>{label}</span>
                </Link>
              );
            })}
          </div>

          {/* Right actions */}
          <div className="mtp-navbar__meta">
            <a
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mtp-navlink desktop-flex"
              aria-label="Repositorio en GitHub"
            >
              <Code2 size={13} strokeWidth={2.5} />
              <span>GitHub</span>
            </a>
            <button
              type="button"
              className="mtp-nav-toggle"
              aria-label="Abrir menÃº de navegaciÃ³n"
              onClick={() => setIsOpen(true)}
            >
              <Menu size={20} />
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile Full Screen Menu Overlay */}
      {isOpen && (
        <div className="mobile-menu-overlay">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <span className="mtp-brand__mark">
                <Train size={18} strokeWidth={2.5} />
              </span>
              <div>
                <div className="mtp-brand__title" style={{ fontSize: '1.4rem' }}>
                  CercanÃ­as<span>.</span>
                </div>
                <div className="mtp-brand__sub">Madrid Â· Monitor en tiempo real</div>
              </div>
            </div>
            <button
              aria-label="Cerrar menÃº de navegaciÃ³n"
              className="mtp-icon-btn"
              onClick={() => setIsOpen(false)}
            >
              <X size={20} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
            {navLinks.map(({ href, label, icon: Icon }) => {
              const active = pathname === href;
              return (
                <Link prefetch={false}
                  key={href}
                  href={href}
                  onClick={() => setIsOpen(false)}
                  className={`mtp-navlink${active ? ' is-active' : ''}`}
                  style={{ padding: '1rem', fontSize: '0.9rem', justifyContent: 'flex-start', gap: '0.8rem' }}
                >
                  <Icon size={20} strokeWidth={2.5} />
                  <span>{label}</span>
                </Link>
              );
            })}
            <a
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mtp-navlink"
              style={{ padding: '1rem', fontSize: '0.9rem', justifyContent: 'flex-start', gap: '0.8rem' }}
            >
              <Code2 size={20} strokeWidth={2.5} />
              <span>GitHub</span>
            </a>
          </div>
        </div>
      )}
    </>
  );
}

