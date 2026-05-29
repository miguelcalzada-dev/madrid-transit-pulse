/**
 * VehicleStatus.js - Modelo Mongoose para el estado actual de vehículos
 * Madrid Transit Pulse: Backend API
 *
 * Mantiene la "foto actual" de cada vehículo activo en el sistema.
 * Se actualiza con upsert en cada ciclo de procesamiento de Spark.
 */

const mongoose = require('mongoose');

const vehicleStatusSchema = new mongoose.Schema(
  {
    vehicleId: {
      type: String,
      required: true,
      unique: true,  // Un doc por vehículo, se actualiza con upsert
      index: true,
    },
    lineId:    { type: String, required: true, index: true },
    lineName:  { type: String },
    source:    { type: String, enum: ['RENFE'], required: true },

    // Posición geográfica actual
    latitude:  { type: Number },
    longitude: { type: Number },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number] },
    },

    speedKmh:       { type: Number, default: 0 },
    bearing:        { type: Number, min: 0, max: 360 },
    vehicleStatus:  { type: String, enum: ['EN_RUTA', 'EN_PARADA', 'FUERA_DE_SERVICIO', 'DESCONOCIDO'] },
    occupancyPct:   { type: Number, min: 0, max: 100 },
    delaySeconds:   { type: Number, default: 0 },

    // Conteo de lecturas sin movimiento (usado para detectar anomalías)
    lecturasInmovil:  { type: Number, default: 0 },
    tieneAlerta:      { type: Boolean, default: false },

    lastSeenAt: { type: Date, default: Date.now },
    updatedAt:  { type: Date, default: Date.now },
  },
  {
    collection: 'vehicle_status',
    timestamps: false,
    versionKey: false,
  }
);

// TTL: eliminar vehículos que no se han visto en 10 minutos (fuera de servicio)
vehicleStatusSchema.index(
  { lastSeenAt: 1 },
  { expireAfterSeconds: 600, name: 'idx_ttl_vehicle' }
);

vehicleStatusSchema.index({ location: '2dsphere' }, { name: 'idx_geo_vehicle' });

const VehicleStatus = mongoose.model('VehicleStatus', vehicleStatusSchema);

module.exports = VehicleStatus;
