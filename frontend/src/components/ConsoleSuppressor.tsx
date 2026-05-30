'use client';

import { useEffect } from 'react';

export default function ConsoleSuppressor() {
  useEffect(() => {
    const originalError = console.error;
    console.error = (...args) => {
      // Filtrar el warning inofensivo pero molesto de defaultProps en React 18 con Recharts
      if (typeof args[0] === 'string' && args[0].includes('defaultProps will be removed')) {
        return;
      }
      originalError.call(console, ...args);
    };
    return () => {
      console.error = originalError;
    };
  }, []);

  return null;
}
