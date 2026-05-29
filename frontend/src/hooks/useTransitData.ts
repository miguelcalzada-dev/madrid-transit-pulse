'use client';

/**
 * useTransitData.ts - Hook personalizado para datos en tiempo real
 * Madrid Transit Pulse: Frontend
 *
 * Gestiona la conexión WebSocket con el backend y expone el estado
 * actualizado de alertas, vehículos y estadísticas al resto de la UI.
 *
 * Uso:
 *   const { alertas, vehiculos, stats, conectado } = useTransitData();
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  TransitAlert,
  VehicleData,
  SystemStats,
  TransitDataState,
  TransitUpdateEvent,
  VehicleUpdateEvent,
  StatsUpdateEvent,
} from '@/types/transit';

// Máximo de alertas a mantener en memoria (evita memory leaks en sesiones largas)
const MAX_ALERTAS_EN_MEMORIA = 100;

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';

/**
 * Hook principal de datos de transporte en tiempo real.
 *
 * @param lineIdFiltro - Opcional. Si se proporciona, suscribe al room de esa línea.
 * @returns Estado completo del sistema de transporte
 */
export const useTransitData = (lineIdFiltro?: string): TransitDataState => {
  const socketRef = useRef<Socket | null>(null);

  const [estado, setEstado] = useState<TransitDataState>({
    alertas:            [],
    vehiculos:          [],
    stats:              null,
    conectado:          false,
    ultimaActualizacion: null,
    error:              null,
  });

  // ----------------------------------------------------------
  // Manejadores de eventos WebSocket (memorizados para evitar
  // re-renders innecesarios)
  // ----------------------------------------------------------

  const manejarTransitUpdate = useCallback((evento: TransitUpdateEvent) => {
    setEstado(prev => {
      const cutoff = Date.now() - 30 * 60 * 1000;
      
      // Para el estado inicial, reemplazamos completamente las listas
      if (evento.tipo === 'estado_inicial') {
        const filteredAlertas = evento.alertas.filter(a => new Date(a.detectedAt).getTime() > cutoff);
        const sourceVehiculos = evento.vehiculos || prev.vehiculos;
        const filteredVehiculos = sourceVehiculos.filter(v => new Date(v.lastSeenAt).getTime() > cutoff);
        
        return {
          ...prev,
          alertas: filteredAlertas,
          vehiculos: filteredVehiculos,
          ultimaActualizacion: new Date(evento.timestamp),
          error: null,
        };
      }

      // Para actualizaciones parciales, prepend de nuevas alertas
      // asegurando que no haya duplicados (evita warnings de unique key)
      const nuevasAlertas = evento.alertas || [];
      const idsNuevas = new Set(nuevasAlertas.map((a: TransitAlert) => a._id));
      const alertasAnteriores = prev.alertas.filter(a => !idsNuevas.has(a._id));

      const alertasActualizadas = [
        ...nuevasAlertas,
        ...alertasAnteriores,
      ].filter(a => new Date(a.detectedAt).getTime() > cutoff).slice(0, MAX_ALERTAS_EN_MEMORIA);

      return {
        ...prev,
        alertas: alertasActualizadas,
        ultimaActualizacion: new Date(evento.timestamp),
        error: null,
      };
    });
  }, []);

  const manejarVehicleUpdate = useCallback((evento: VehicleUpdateEvent) => {
    setEstado(prev => {
      const cutoff = Date.now() - 30 * 60 * 1000;
      const filteredVehiculos = evento.vehiculos.filter(v => new Date(v.lastSeenAt).getTime() > cutoff);
      
      return {
        ...prev,
        vehiculos: filteredVehiculos,
        ultimaActualizacion: new Date(evento.timestamp),
      };
    });
  }, []);

  const manejarStatsUpdate = useCallback((evento: StatsUpdateEvent) => {
    setEstado(prev => ({
      ...prev,
      stats: evento.stats,
      ultimaActualizacion: new Date(evento.timestamp),
    }));
  }, []);

  // ----------------------------------------------------------
  // Ciclo de vida de la conexión WebSocket y Ventana Móvil
  // ----------------------------------------------------------

  // Cleanup periodico (ventana móvil 30 mins)
  useEffect(() => {
    const interval = setInterval(() => {
      setEstado(prev => {
        const cutoff = Date.now() - 30 * 60 * 1000;
        let changed = false;
        
        const filteredAlertas = prev.alertas.filter(a => new Date(a.detectedAt).getTime() > cutoff);
        if (filteredAlertas.length !== prev.alertas.length) changed = true;
        
        const filteredVehiculos = prev.vehiculos.filter(v => new Date(v.lastSeenAt).getTime() > cutoff);
        if (filteredVehiculos.length !== prev.vehiculos.length) changed = true;
        
        if (!changed) return prev;
        
        return {
          ...prev,
          alertas: filteredAlertas,
          vehiculos: filteredVehiculos,
        };
      });
    }, 60000); // 1 minuto
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Crear la conexión Socket.io
    const socket = io(WS_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
    });

    socketRef.current = socket;

    // Eventos de conexión
    socket.on('connect', () => {
      console.log('🟢 WebSocket conectado:', socket.id);
      setEstado(prev => ({ ...prev, conectado: true, error: null }));

      // Si hay un filtro de línea, suscribirse al room correspondiente
      if (lineIdFiltro) {
        socket.emit('subscribe-line', lineIdFiltro);
      }
    });

    socket.on('disconnect', (reason) => {
      console.warn('🔴 WebSocket desconectado:', reason);
      setEstado(prev => ({ ...prev, conectado: false }));
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Error de conexión WebSocket:', error.message);
      setEstado(prev => ({
        ...prev,
        conectado: false,
        error: `Sin conexión con el servidor. Reconectando...`,
      }));
    });

    // Eventos de datos del dominio
    socket.on('transit-update', manejarTransitUpdate);
    socket.on('vehicle-update', manejarVehicleUpdate);
    socket.on('stats-update',   manejarStatsUpdate);

    // Cleanup: desconectar al desmontar el componente
    return () => {
      console.log('🔌 Cerrando conexión WebSocket...');
      socket.off('transit-update', manejarTransitUpdate);
      socket.off('vehicle-update', manejarVehicleUpdate);
      socket.off('stats-update',   manejarStatsUpdate);
      socket.disconnect();
    };
  }, [lineIdFiltro, manejarTransitUpdate, manejarVehicleUpdate, manejarStatsUpdate]);

  return estado;
};
