/**
 * mockDb.js - Base de datos mixta en memoria
 * Madrid Transit Pulse: Backend API
 */

const { EventEmitter } = require('events');
const { getPuntoEnRuta, extraerLineaDeDescripcion, clasificarSeveridad } = require('./routeCoords');
const axios = require('axios');
const cheerio = require('cheerio');
const logger = require('../config/logger');

// Configuración de Feeds de Renfe
const RENFE_VEHICLES_URL = 'https://gtfsrt.renfe.com/vehicle_positions.json';
const RENFE_UPDATES_URL  = 'https://gtfsrt.renfe.com/trip_updates.json';
const RENFE_ALERTS_URL   = 'https://gtfsrt.renfe.com/alerts.json';

// Rango geográfico Comunidad de Madrid
const MADRID_BOUNDS = { latMin: 39.5, latMax: 41.5, lonMin: -4.8, lonMax: -3.0 };

const ESTACIONES_MADRID = {
  C1:  { lat: 40.4143, lon: -3.7194 },
  C2:  { lat: 40.4720, lon: -3.6795 },
  C3:  { lat: 40.4058, lon: -3.6920 },
  C4:  { lat: 40.4058, lon: -3.6920 },
  C5:  { lat: 40.4058, lon: -3.6920 },
  C7:  { lat: 40.4720, lon: -3.6795 },
  C8:  { lat: 40.4720, lon: -3.6795 },
  C10: { lat: 40.4143, lon: -3.7194 },
};

let alertas = [];
const vehiculos = new Map();
let idCounter = 1000;
const dbEvents = new EventEmitter();

const generarId = () => `mock_${(++idCounter).toString(16)}`;

// ============================================================
// INGESTA REAL DE RENFE (CERCANÍAS MADRID)
// ============================================================
const consultarPosicionesRenfe = async () => {
  try {
    const response = await axios.get(RENFE_VEHICLES_URL, { timeout: 8000 });
    const data = response.data;
    if (!data || !data.entity) return;

    let trenesActualizados = 0;
    for (const ent of data.entity) {
      const v = ent.vehicle;
      if (!v) continue;
      const rawVehicleId = v.vehicle?.id || v.trip?.tripId || generarId();
      const label = v.vehicle?.label || '';
      
      let lineId = '';
      const match = label.match(/C\d+/i) || (v.trip?.tripId || '').match(/C\d+/i);
      if (match) lineId = match[0].toUpperCase();

      if (!lineId || !['C1', 'C2', 'C3', 'C4', 'C5', 'C7', 'C8', 'C9', 'C10'].includes(lineId)) continue;

      let lat = v.position?.latitude;
      let lon = v.position?.longitude;
      const fueraDeRango = !lat || lat < MADRID_BOUNDS.latMin || lat > MADRID_BOUNDS.latMax || !lon || lon < MADRID_BOUNDS.lonMin || lon > MADRID_BOUNDS.lonMax;

      if (fueraDeRango) {
        const punto = getPuntoEnRuta(lineId);
        lat = punto.lat;
        lon = punto.lon;
      }

      const vehicleId = `RENFE-${lineId}-${rawVehicleId}`;
      const speed = v.position?.speed !== undefined ? v.position.speed * 3.6 : Math.random() * 50 + 30;
      let status = v.currentStatus === 'STOPPED_AT' ? 'EN_PARADA' : 'EN_RUTA';

      // Generar retrasos de forma realista para la demo
      let delaySeconds = 0;
      let tieneAlerta = false;
      const hasLineAlert = alertas.some(a => a.lineId === lineId || a.lineId === 'CERCANIAS');
      
      if (hasLineAlert && Math.random() > 0.5) {
        tieneAlerta = true;
        delaySeconds = Math.floor(Math.random() * 600) + 120; // 2 a 12 minutos de retraso
      } else if (Math.random() > 0.85) {
        delaySeconds = Math.floor(Math.random() * 180) + 30; // 30s a 3 minutos
      }

      vehiculos.set(vehicleId, {
        _id: vehicleId, vehicleId, lineId, lineName: `Cercanías Madrid - Línea ${lineId}`, source: 'RENFE',
        latitude: lat, longitude: lon, speedKmh: speed, bearing: v.position?.bearing || 0,
        vehicleStatus: status, occupancyPct: Math.floor(Math.random() * 65 + 20), delaySeconds,
        tieneAlerta, lastSeenAt: new Date(v.timestamp ? parseInt(v.timestamp) * 1000 : Date.now()).toISOString(),
      });
      trenesActualizados++;
    }
    logger.info(`🚆 [Renfe API] ${trenesActualizados} trenes de Cercanías mapeados en vivo`);
  } catch (err) {
    logger.error(`❌ [Renfe Ingestion] Error posiciones: ${err.message}`);
  }
};

const consultarAlertasRenfe = async () => {
  try {
    const response = await axios.get(RENFE_ALERTS_URL, { timeout: 8000 });
    const data = response.data;
    if (!data || !data.entity) return;

    let nuevasAlertas = [];
    const descripcionesVistas = new Set(); // Para deduplicar alertas repetitivas

    for (const ent of data.entity) {
      const alert = ent.alert;
      if (!alert) continue;
      
      const isMadrid = alert.informedEntity?.some(e => (e.routeId && e.routeId.includes('C')));
      if (!isMadrid) continue;

      const header = alert.headerText?.translation?.[0]?.text || '';
      const desc = alert.descriptionText?.translation?.[0]?.text || header;
      if (!desc) continue;

      // Deduplicar: si ya tenemos esta descripción exacta, la ignoramos
      if (descripcionesVistas.has(desc)) continue;
      descripcionesVistas.add(desc);

      const lineIdAlerta = extraerLineaDeDescripcion(desc);
      const lineNameAlerta = lineIdAlerta !== 'CERCANIAS'
        ? `Cercanías Madrid - Línea ${lineIdAlerta}`
        : 'Cercanías Madrid';
      const severidadAlerta = clasificarSeveridad(desc);

      nuevasAlertas.push({
        _id: `renfe_alert_${ent.id}`,
        vehicleId: null, lineId: lineIdAlerta, lineName: lineNameAlerta, source: 'RENFE',
        alertType: 'incidencia_oficial', description: desc, severity: severidadAlerta,
        latitude: 40.4058, longitude: -3.6920, speedKmh: 0, delaySeconds: 0,
        detectedAt: new Date().toISOString(), processedAt: new Date().toISOString(), createdAt: new Date().toISOString(),
      });
    }
    
    if (nuevasAlertas.length > 0) {
      alertas = [...nuevasAlertas, ...alertas.filter(a => a.source !== 'RENFE')].slice(0, 200);
      dbEvents.emit('nuevas_alertas', nuevasAlertas);
      logger.info(`📢 [Renfe API] ${nuevasAlertas.length} incidencias únicas activas procesadas`);
    }
  } catch (err) {
    logger.error(`❌ [Renfe Ingestion] Error alertas: ${err.message}`);
  }
};


// ============================================================
// INICIALIZACIÓN
// ============================================================
const inicializar = async () => {
  logger.info('🗃️  [MockDB] Inicializando integraciones en tiempo real (Renfe GTFS-RT)...');

  // Loops principales
  consultarPosicionesRenfe();
  consultarAlertasRenfe();

  setInterval(() => consultarPosicionesRenfe(), 25000);
  setInterval(() => consultarAlertasRenfe(), 60000);
  setInterval(() => {
    dbEvents.emit('vehiculos_actualizados', [...vehiculos.values()]);
  }, 10000);

  // Garbage Collector: Limpiar trenes que no emiten desde hace más de 30 mins
  setInterval(() => {
    const cutoff = Date.now() - 30 * 60 * 1000;
    let eliminados = 0;
    for (const [id, v] of vehiculos.entries()) {
      if (new Date(v.lastSeenAt).getTime() < cutoff) {
        vehiculos.delete(id);
        eliminados++;
      }
    }
    if (eliminados > 0) {
      logger.info(`🧹 [Garbage Collector] Eliminados ${eliminados} trenes inactivos (>30 mins) de la memoria`);
    }
  }, 60000);
};

// ============================================================
// API pública
// ============================================================
const MockTransitAlert = {
  obtenerRecientes: (filtros = {}, limite = 50) => {
    let res = alertas;
    if (filtros.lineId) res = res.filter(a => a.lineId === filtros.lineId);
    if (filtros.source) res = res.filter(a => a.source === filtros.source);
    return Promise.resolve(res.slice(0, limite));
  },
  find: (filtro = {}) => {
    let res = alertas;
    // Aplicar cada clave del filtro como igualdad estricta
    for (const [key, val] of Object.entries(filtro)) {
      res = res.filter(a => a[key] === val);
    }
    return {
      sort: () => ({ limit: (n) => ({ lean: () => Promise.resolve(res.slice(0, n)) }) }),
      lean: () => Promise.resolve(res),
    };
  },
  countDocuments: () => Promise.resolve(alertas.length),
  contarPorSeveridad: () => Promise.resolve([{_id:'ALTA', count:alertas.filter(a=>a.severity==='ALTA').length}, {_id:'MEDIA', count:alertas.filter(a=>a.severity==='MEDIA').length}]),
  topLineasConAlertas: () => Promise.resolve([]),
  aggregate: () => Promise.resolve([{_id:'RENFE', count:alertas.filter(a=>a.source==='RENFE').length}]),
};

const MockVehicleStatus = {
  find: () => {
    const arr = [...vehiculos.values()];
    return { sort: () => ({ limit: (n) => ({ lean: () => Promise.resolve(arr.slice(0, n)) }) }), lean: () => Promise.resolve(arr) };
  },
  countDocuments: (filtro = {}) => {
    if (filtro.tieneAlerta !== undefined) return Promise.resolve([...vehiculos.values()].filter(v => v.tieneAlerta === filtro.tieneAlerta).length);
    return Promise.resolve(vehiculos.size);
  },
};

module.exports = { MockTransitAlert, MockVehicleStatus, dbEvents, inicializar };
