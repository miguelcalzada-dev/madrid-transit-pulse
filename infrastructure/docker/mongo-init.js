// ============================================================
// MongoDB - Script de inicialización
// Madrid Transit Pulse
// ============================================================
// Se ejecuta automáticamente al primer arranque del contenedor

// Cambiamos a la base de datos del proyecto
db = db.getSiblingDB('madrid_transit');

// Creamos el usuario de la aplicación con permisos limitados
db.createUser({
  user: 'mtp_app',
  pwd: 'mtp_secure_pass',
  roles: [
    { role: 'readWrite', db: 'madrid_transit' }
  ]
});

// ----------------------------------------------------------
// Colección: transit_alerts
// Almacena las anomalías detectadas por Spark
// ----------------------------------------------------------
db.createCollection('transit_alerts', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['lineId', 'vehicleId', 'alertType', 'timestamp'],
      properties: {
        lineId: { bsonType: 'string', description: 'ID de la línea de transporte' },
        vehicleId: { bsonType: 'string', description: 'Identificador del vehículo' },
        alertType: {
          bsonType: 'string',
          enum: ['posible_retraso_grave', 'servicio_interrumpido', 'anomalia_ruta'],
          description: 'Tipo de anomalía detectada'
        },
        timestamp: { bsonType: 'date', description: 'Timestamp de detección' },
        coordinates: {
          bsonType: 'object',
          properties: {
            lat: { bsonType: 'double' },
            lon: { bsonType: 'double' }
          }
        }
      }
    }
  }
});

// ----------------------------------------------------------
// Colección: vehicle_status
// Foto en tiempo real de todos los vehículos activos
// ----------------------------------------------------------
db.createCollection('vehicle_status');

// ----------------------------------------------------------
// Índices para rendimiento óptimo en queries frecuentes
// ----------------------------------------------------------

// TTL: Las alertas expiran después de 24 horas automáticamente
db.transit_alerts.createIndex(
  { timestamp: 1 },
  { expireAfterSeconds: 86400, name: 'idx_ttl_alerts' }
);

// Índice compuesto para búsquedas por línea + timestamp
db.transit_alerts.createIndex(
  { lineId: 1, timestamp: -1 },
  { name: 'idx_line_timestamp' }
);

// Índice geoespacial para queries de proximidad
db.vehicle_status.createIndex(
  { location: '2dsphere' },
  { name: 'idx_geo_location' }
);

// Índice por vehicleId para upserts eficientes
db.vehicle_status.createIndex(
  { vehicleId: 1 },
  { unique: true, name: 'idx_vehicle_id' }
);

print('✅ Base de datos madrid_transit inicializada correctamente.');
print('✅ Colecciones: transit_alerts, vehicle_status');
print('✅ Índices creados: TTL, compuesto, geoespacial');
