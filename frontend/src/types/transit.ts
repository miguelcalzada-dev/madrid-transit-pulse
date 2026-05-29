/**
 * types/transit.ts - Tipos TypeScript del dominio de transporte
 * Madrid Transit Pulse: Frontend
 *
 * Espejo de los modelos del backend. Mantenidos en un único lugar
 * para facilitar actualizaciones y evitar duplicaciones.
 */

// ============================================================
// Enums
// ============================================================

export type DataSource = 'RENFE';
export type VehicleStatus = 'EN_RUTA' | 'EN_PARADA' | 'FUERA_DE_SERVICIO' | 'DESCONOCIDO';
export type AlertType = 'posible_retraso_grave' | 'servicio_interrumpido' | 'anomalia_ruta' | 'incidencia_oficial';
export type Severity = 'ALTA' | 'MEDIA' | 'BAJA';

// ============================================================
// Modelos de datos
// ============================================================

/** Alerta detectada por Spark Structured Streaming */
export interface TransitAlert {
  _id: string;
  vehicleId: string;
  lineId: string;
  lineName?: string;
  source: DataSource;
  alertType: AlertType;
  description?: string;
  severity: Severity;
  latitude?: number;
  longitude?: number;
  speedKmh?: number;
  delaySeconds?: number;
  detectedAt: string;   // ISO 8601
  processedAt?: string; // ISO 8601
  createdAt?: string;
}

/** Estado actual de un vehículo en el mapa */
export interface VehicleData {
  _id: string;
  vehicleId: string;
  lineId: string;
  lineName?: string;
  source: DataSource;
  latitude?: number;
  longitude?: number;
  speedKmh?: number;
  bearing?: number;
  vehicleStatus: VehicleStatus;
  occupancyPct?: number;
  delaySeconds?: number;
  tieneAlerta: boolean;
  lastSeenAt: string;
}

/** Estadísticas de resumen del sistema */
export interface SystemStats {
  totalVehiculos: number;
  vehiculosConAlerta: number;
  porcentajeConAlerta?: string;
  alertasPorSeveridad: {
    ALTA: number;
    MEDIA: number;
    BAJA: number;
  };
  distribucionFuente?: {
    EMT: number;
    RENFE: number;
  };
}

/** Línea con incidencias activas */
export interface LineIncident {
  lineId: string;
  lineName?: string;
  source: DataSource;
  count: number;
  ultimaAlerta?: string;
}

// ============================================================
// Tipos de eventos WebSocket
// ============================================================

/** Evento 'transit-update' recibido por Socket.io */
export interface TransitUpdateEvent {
  tipo: 'estado_inicial' | 'nuevas_alertas';
  timestamp: string;
  cantidad?: number;
  alertas: TransitAlert[];
  vehiculos?: VehicleData[];
}

/** Evento 'vehicle-update' recibido por Socket.io */
export interface VehicleUpdateEvent {
  timestamp: string;
  vehiculos: VehicleData[];
}

/** Evento 'stats-update' recibido por Socket.io */
export interface StatsUpdateEvent {
  timestamp: string;
  stats: SystemStats;
}

// ============================================================
// Estado del hook useTransitData
// ============================================================

export interface TransitDataState {
  alertas: TransitAlert[];
  vehiculos: VehicleData[];
  stats: SystemStats | null;
  conectado: boolean;
  ultimaActualizacion: Date | null;
  error: string | null;
}
