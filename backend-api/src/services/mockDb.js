/**
 * mockDb.js - Base de datos mixta en memoria
 * Madrid Transit Pulse: Backend API
 */

const { EventEmitter } = require('events');
const { getPuntoEnRuta, extraerLineaDeDescripcion, clasificarSeveridad, haversineDistance, LINEAS_CERCANIAS } = require('./routeCoords');
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
const historicoPosiciones = new Map(); // Guarda la posición anterior para vectores de dirección
let idCounter = 1000;
const dbEvents = new EventEmitter();

const generarId = () => `mock_${(++idCounter).toString(16)}`;

// ============================================================
// INGESTA REAL DE RENFE (CERCANÍAS MADRID)
// ============================================================
const consultarPosicionesRenfe = async () => {
  try {
    const [vehResponse, tripResponse] = await Promise.allSettled([
      axios.get(RENFE_VEHICLES_URL, { timeout: 8000 }),
      axios.get(RENFE_UPDATES_URL, { timeout: 8000 })
    ]);
    
    const data = vehResponse.status === 'fulfilled' ? vehResponse.value.data : null;
    const tripData = tripResponse.status === 'fulfilled' ? tripResponse.value.data : null;
    
    if (!data || !data.entity) return;

    // Map real delays from trip_updates
    const realDelays = new Map();
    if (tripData && tripData.entity) {
      for (const ent of tripData.entity) {
        const tu = ent.tripUpdate;
        if (!tu || !tu.trip || !tu.trip.tripId) continue;
        let delay = tu.delay || 0;
        if (!delay && tu.stopTimeUpdate && tu.stopTimeUpdate.length > 0) {
          delay = tu.stopTimeUpdate[0].arrival?.delay || tu.stopTimeUpdate[0].departure?.delay || 0;
        }
        realDelays.set(tu.trip.tripId, delay);
      }
    }

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
      const speed = v.position?.speed !== undefined ? v.position.speed * 3.6 : null;
      let status = v.currentStatus === 'STOPPED_AT' ? 'EN_PARADA' : 'EN_RUTA';

      // Use real delay from trip_updates
      let delaySeconds = realDelays.get(v.trip?.tripId) || 0;
      
      // Determine if there's a line alert (for UI warning indicators, independent of delay)
      let tieneAlerta = alertas.some(a => a.lineId === lineId && a.severity !== 'BAJA');

      // Update history for direction vectors
      const currentPos = { lat, lon, time: Date.now() };
      const prevPos = historicoPosiciones.get(vehicleId) || currentPos;
      historicoPosiciones.set(vehicleId, currentPos);

      vehiculos.set(vehicleId, {
        _id: vehicleId, vehicleId, lineId, lineName: `Cercanías Madrid - Línea ${lineId}`, source: 'RENFE',
        latitude: lat, longitude: lon, speedKmh: speed, bearing: v.position?.bearing || 0,
        vehicleStatus: status, occupancyPct: null, delaySeconds,
        tieneAlerta, lastSeenAt: new Date(v.timestamp ? parseInt(v.timestamp) * 1000 : Date.now()).toISOString(),
        prevLatitude: prevPos.lat, prevLongitude: prevPos.lon
      });
      trenesActualizados++;
    }
    
    // Cleanup de trenes inactivos (más de 3 minutos sin datos)
    const limiteTiempo = Date.now() - 3 * 60 * 1000;
    let trenesBorrados = 0;
    for (const [id, v] of vehiculos.entries()) {
      if (new Date(v.lastSeenAt).getTime() < limiteTiempo) {
        vehiculos.delete(id);
        historicoPosiciones.delete(id);
        trenesBorrados++;
      }
    }

    logger.info(`🚆 [Renfe API] ${trenesActualizados} trenes mapeados, ${trenesBorrados} inactivos purgados`);
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

      // Conservar la fecha original si la incidencia ya existía
      const idStr = `renfe_alert_${ent.id}`;
      const alertaExistente = alertas.find(a => a._id === idStr || a.description === desc);
      const fechaDetectado = alertaExistente?.detectedAt || (alert.activePeriod?.[0]?.start ? new Date(alert.activePeriod[0].start * 1000).toISOString() : new Date().toISOString());

      // Usar coordenadas representativas de la línea, no siempre Atocha
      const coordsLinea = LINEAS_CERCANIAS[lineIdAlerta]?.puntos?.[Math.floor(LINEAS_CERCANIAS[lineIdAlerta].puntos.length / 2)]
        || { lat: 40.4168, lon: -3.7038 }; // Fallback: Sol (centroide de la red)

      nuevasAlertas.push({
        _id: idStr,
        vehicleId: null, lineId: lineIdAlerta, lineName: lineNameAlerta, source: 'RENFE',
        alertType: 'incidencia_oficial', description: desc, severity: severidadAlerta,
        latitude: coordsLinea.lat, longitude: coordsLinea.lon, speedKmh: 0, delaySeconds: 0,
        detectedAt: fechaDetectado, processedAt: new Date().toISOString(), createdAt: alertaExistente?.createdAt || fechaDetectado,
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
    const builder = {
      _sorted: res,
      _skip: 0,
      _limit: res.length,
      sort(sortArg) {
        if (sortArg && sortArg.detectedAt === -1) {
          this._sorted = [...this._sorted].sort((a, b) => new Date(b.detectedAt) - new Date(a.detectedAt));
        }
        return this;
      },
      skip(n) { this._skip = n || 0; return this; },
      limit(n) { this._limit = n || this._sorted.length; return this; },
      lean() { return Promise.resolve(this._sorted.slice(this._skip, this._skip + this._limit)); },
    };
    return builder;
  },
  countDocuments: (filtro = {}) => {
    let res = alertas;
    for (const [key, val] of Object.entries(filtro)) {
      res = res.filter(a => a[key] === val);
    }
    return Promise.resolve(res.length);
  },
  contarPorSeveridad: () => {
    const severidades = ['ALTA', 'MEDIA', 'BAJA'];
    const counts = severidades.map(sev => ({
      _id: sev,
      count: alertas.filter(a => a.severity === sev).length
    }));
    return Promise.resolve(counts);
  },
  topLineasConAlertas: () => {
    const conteo = {};
    for (const a of alertas) {
      if (!a.lineId || a.lineId === 'CERCANIAS') continue;
      conteo[a.lineId] = (conteo[a.lineId] || 0) + 1;
    }
    const top = Object.entries(conteo)
      .map(([lineId, count]) => ({ _id: lineId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    return Promise.resolve(top);
  },
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

const generarHorarioEstacion = (lineas = []) => {
  const llegadas = [];
  const nowMs = Date.now();
  const now = new Date(nowMs);
  const currentMinutesOfDay = now.getHours() * 60 + now.getMinutes();

  // Headways reales según franja horaria (Renfe Cercanías Madrid)
  const horaActual = now.getHours();
  const esHoraPunta = (horaActual >= 7 && horaActual <= 9) || (horaActual >= 17 && horaActual <= 20);
  const esNocheOrMadrugada = horaActual < 6 || horaActual >= 23;

  const HEADWAYS_PUNTA   = { 'C1': 10, 'C2': 10, 'C3': 10, 'C4':  5, 'C5':  7, 'C7': 10, 'C8': 20, 'C9': 60, 'C10': 20 };
  const HEADWAYS_NORMAL  = { 'C1': 15, 'C2': 15, 'C3': 20, 'C4': 10, 'C5': 10, 'C7': 15, 'C8': 30, 'C9': 60, 'C10': 30 };
  const HEADWAYS_NOCHE   = { 'C1': 30, 'C2': 30, 'C3': 30, 'C4': 20, 'C5': 20, 'C7': 30, 'C8': 60, 'C9': 120, 'C10': 60 };

  const HEADWAYS_MINUTES = esHoraPunta ? HEADWAYS_PUNTA : esNocheOrMadrugada ? HEADWAYS_NOCHE : HEADWAYS_NORMAL;

  // 1. Calcular el retraso promedio por línea basado en los vehículos reales
  const retrasosPorLinea = {};
  for (const v of vehiculos.values()) {
    if (!retrasosPorLinea[v.lineId]) {
      retrasosPorLinea[v.lineId] = { totalDelay: 0, count: 0 };
    }
    // Asumimos un retraso mínimo reportado por incidencias o simplemente la métrica delaySeconds
    const delay = v.delaySeconds || 0;
    retrasosPorLinea[v.lineId].totalDelay += delay;
    retrasosPorLinea[v.lineId].count++;
  }

  const getRetrasoPromedioMinutos = (lineId) => {
    if (!retrasosPorLinea[lineId] || retrasosPorLinea[lineId].count === 0) return 0;
    const avgSec = retrasosPorLinea[lineId].totalDelay / retrasosPorLinea[lineId].count;
    return Math.round(avgSec / 60);
  };

  // 2. Generar el horario de base
  lineas.forEach(lineId => {
    const headway = HEADWAYS_MINUTES[lineId] || 15;
    const lineaInfo = LINEAS_CERCANIAS[lineId] || { nombre: 'Dirección A - Dirección B' };
    const extremos = lineaInfo.nombre.split(' - ');
    const extremoA = extremos[0] || 'Dirección A';
    const extremoB = extremos[1] || 'Dirección B';
    
    // Retraso real inyectado (o un ligero factor aleatorio si el backend dice que hay alerta general)
    let delayMinutos = getRetrasoPromedioMinutos(lineId);
    
    // Si la línea tiene alerta activa de alta severidad, añadimos 3 minutos fijos de margen
    const tieneAlertaAlta = alertas.some(a => a.lineId === lineId && a.severity === 'ALTA');
    if (tieneAlertaAlta && delayMinutos < 3) {
      delayMinutos = 3;
    }

    // Ventana de 90 minutos hacia adelante
    for (let m = currentMinutesOfDay; m < currentMinutesOfDay + 90; m++) {
      if (m % headway === 0) {
        // Alternar el destino (ej: Móstoles vs Fuenlabrada vs Humanes)
        // Usamos m para ser deterministas y alternar
        const esAlternativo = (m / headway) % 2 === 0;

        let destA = extremoA;
        if (lineId === 'C5' && destA === 'Humanes' && esAlternativo) destA = 'Fuenlabrada';

        // Dirección A
        const mStrA = new Date(now.getFullYear(), now.getMonth(), now.getDate(), Math.floor(m / 60), m % 60).getTime();
        llegadas.push({
          lineId,
          destino: destA,
          sentido: extremoA, // Usamos el extremo principal como nombre de sentido
          scheduledTime: mStrA,
          realTime: mStrA + (delayMinutos * 60 * 1000),
          retrasoMinutos: delayMinutos,
          estado: delayMinutos > 2 ? 'RETRASO' : 'EN_HORA'
        });

        let destB = extremoB;
        if (lineId === 'C5' && destB === 'Humanes' && !esAlternativo) destB = 'Fuenlabrada';

        // Dirección B (desfasada a mitad de intervalo)
        const mB = m + Math.floor(headway / 2);
        const mStrB = new Date(now.getFullYear(), now.getMonth(), now.getDate(), Math.floor(mB / 60), mB % 60).getTime();
        llegadas.push({
          lineId,
          destino: destB,
          sentido: extremoB, // Usamos el extremo principal como nombre de sentido
          scheduledTime: mStrB,
          realTime: mStrB + (delayMinutos * 60 * 1000),
          retrasoMinutos: delayMinutos,
          estado: delayMinutos > 2 ? 'RETRASO' : 'EN_HORA'
        });
      }
    }
  });
  
  // Ordenar por hora real de llegada
  return llegadas.sort((a, b) => a.realTime - b.realTime).slice(0, 20); // Top 20 llegadas
};

module.exports = { MockTransitAlert, MockVehicleStatus, dbEvents, inicializar, generarHorarioEstacion };
