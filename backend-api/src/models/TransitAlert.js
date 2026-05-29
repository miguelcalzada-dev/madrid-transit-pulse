/**
 * TransitAlert.js - Modelo Mongoose para las alertas de transporte
 * Madrid Transit Pulse: Backend API
 *
 * Espejo de la colección 'transit_alerts' creada por el procesador Spark.
 * El esquema debe coincidir con el output de transit_processor.py.
 */

const mongoose = require('mongoose');

// ============================================================
// Esquema de Alerta
// ============================================================
const transitAlertSchema = new mongoose.Schema(
  {
    // ----------------------------------------------------------
    // Identificadores del vehículo y línea
    // ----------------------------------------------------------
    vehicleId: {
      type: String,
      required: true,
      index: true,
      description: 'ID único del vehículo (ej: EMT-27-BUS-001)',
    },
    lineId: {
      type: String,
      required: true,
      index: true,
      description: 'Número/código de la línea (ej: 27, C1)',
    },
    lineName: {
      type: String,
      description: 'Nombre descriptivo de la línea',
    },
    source: {
      type: String,
      enum: ['RENFE'],
      required: true,
      description: 'Fuente del dato: RENFE (cercanías)',
    },

    // ----------------------------------------------------------
    // Tipo y descripción de la alerta
    // ----------------------------------------------------------
    alertType: {
      type: String,
      enum: ['posible_retraso_grave', 'servicio_interrumpido', 'anomalia_ruta'],
      required: true,
      index: true,
    },
    description: {
      type: String,
      description: 'Descripción legible de la anomalía detectada',
    },
    severity: {
      type: String,
      enum: ['ALTA', 'MEDIA', 'BAJA'],
      default: 'MEDIA',
      index: true,
    },

    // ----------------------------------------------------------
    // Posición geográfica del vehículo en el momento de la alerta
    // ----------------------------------------------------------
    latitude: {
      type: Number,
      min: -90,
      max: 90,
    },
    longitude: {
      type: Number,
      min: -180,
      max: 180,
    },

    // Formato GeoJSON para queries geoespaciales con $near, $geoWithin
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitud, latitud] — orden GeoJSON
        default: undefined,
      },
    },

    // ----------------------------------------------------------
    // Métricas de retraso y velocidad
    // ----------------------------------------------------------
    speedKmh: {
      type: Number,
      min: 0,
      description: 'Velocidad del vehículo en km/h en el momento de la alerta',
    },
    delaySeconds: {
      type: Number,
      description: 'Retraso acumulado en segundos respecto al horario planificado',
    },

    // ----------------------------------------------------------
    // Timestamps de detección y procesamiento
    // ----------------------------------------------------------
    detectedAt: {
      type: Date,
      required: true,
      description: 'Momento en que Spark detectó la anomalía',
    },
    processedAt: {
      type: Date,
      description: 'Momento en que Spark finalizó el procesamiento del batch',
    },

    // Campo para el TTL index de MongoDB (las alertas expiran en 24h)
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    // Opciones del schema
    timestamps: true,              // Añade createdAt y updatedAt automáticamente
    collection: 'transit_alerts',  // Nombre explícito de la colección
    versionKey: false,             // Desactiva el campo __v
  }
);

// ============================================================
// Middleware pre-save: calcular campo location para GeoJSON
// ============================================================
transitAlertSchema.pre('save', function (next) {
  // Si tenemos coordenadas, construir el campo GeoJSON automáticamente
  if (this.latitude !== undefined && this.longitude !== undefined) {
    this.location = {
      type: 'Point',
      coordinates: [this.longitude, this.latitude], // GeoJSON: [lon, lat]
    };
  }
  next();
});

// ============================================================
// Índices
// ============================================================

// TTL: las alertas se eliminan automáticamente después de 24 horas
transitAlertSchema.index(
  { timestamp: 1 },
  { expireAfterSeconds: 86400, name: 'idx_ttl_alerts' }
);

// Índice compuesto para la query más frecuente del API
transitAlertSchema.index(
  { lineId: 1, detectedAt: -1 },
  { name: 'idx_line_detected' }
);

// Índice de severidad + timestamp para el dashboard
transitAlertSchema.index(
  { severity: 1, detectedAt: -1 },
  { name: 'idx_severity_date' }
);

// Índice geoespacial para queries de proximidad
transitAlertSchema.index(
  { location: '2dsphere' },
  { name: 'idx_geo' }
);

// ============================================================
// Métodos de instancia
// ============================================================

/**
 * Retorna el retraso en formato legible (ej: "3m 20s")
 */
transitAlertSchema.methods.getFormattedDelay = function () {
  if (!this.delaySeconds) return 'Sin datos';
  const minutos = Math.floor(Math.abs(this.delaySeconds) / 60);
  const segundos = Math.abs(this.delaySeconds) % 60;
  const prefijo = this.delaySeconds < 0 ? 'adelantado' : 'retrasado';
  return `${minutos}m ${segundos}s ${prefijo}`;
};

// ============================================================
// Métodos estáticos (queries frecuentes)
// ============================================================

/**
 * Obtiene las alertas más recientes, opcionalmente filtradas.
 *
 * @param {object} filtros - { lineId?, severity?, source? }
 * @param {number} limite - Máximo de documentos a retornar
 * @returns {Promise<TransitAlert[]>}
 */
transitAlertSchema.statics.obtenerRecientes = function (filtros = {}, limite = 50) {
  const query = {};

  if (filtros.lineId)   query.lineId   = filtros.lineId;
  if (filtros.severity) query.severity = filtros.severity;
  if (filtros.source)   query.source   = filtros.source;
  if (filtros.alertType) query.alertType = filtros.alertType;

  return this.find(query)
    .sort({ detectedAt: -1 })
    .limit(limite)
    .lean(); // lean() retorna POJOs en vez de documentos Mongoose (más rápido)
};

/**
 * Retorna el conteo de alertas agrupado por severidad.
 * @returns {Promise<Array<{_id: string, count: number}>>}
 */
transitAlertSchema.statics.contarPorSeveridad = function () {
  return this.aggregate([
    { $group: { _id: '$severity', count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);
};

/**
 * Retorna el conteo de alertas agrupado por línea de transporte.
 * Útil para el dashboard de resumen del frontend.
 * @param {number} topN - Número de líneas con más alertas a retornar
 * @returns {Promise<Array<{lineId: string, lineName: string, count: number}>>}
 */
transitAlertSchema.statics.topLineasConAlertas = function (topN = 10) {
  return this.aggregate([
    {
      $group: {
        _id: '$lineId',
        lineName: { $first: '$lineName' },
        source: { $first: '$source' },
        count: { $sum: 1 },
        ultimaAlerta: { $max: '$detectedAt' },
      },
    },
    { $sort: { count: -1 } },
    { $limit: topN },
    { $project: { _id: 0, lineId: '$_id', lineName: 1, source: 1, count: 1, ultimaAlerta: 1 } },
  ]);
};

const TransitAlert = mongoose.model('TransitAlert', transitAlertSchema);

module.exports = TransitAlert;
