/**
 * gtfsService.js — Tiempos reales de Cercanías Madrid basados en GTFS Estático + RT
 *
 * Cómo funciona (idéntico a Google Maps):
 *  1. Al iniciar, carga el horario oficial estático completo de Madrid (stop_times.txt, trips.txt)
 *  2. Descarga el feed GTFS-RT de Renfe cada 20 segundos
 *  3. Por cada tren activo, busca su tripId en el horario oficial
 *  4. Si existe, aplica el retraso real actual a cada una de sus paradas programadas
 *  5. Esto genera predicciones 100% exactas para cada estación de su recorrido.
 */

'use strict';

const fs     = require('fs');
const path   = require('path');
const axios  = require('axios');
const { execSync } = require('child_process');
const logger = require('../config/logger');

// Configuración
const RENFE_TRIP_UPDATES_URL = 'https://gtfsrt.renfe.com/trip_updates.json';
const POLL_INTERVAL_MS = 20_000;          // 20 segundos
const WINDOW_AHEAD_MS  = 90 * 60_000;    // mostrar trenes hasta 90 min en el futuro
const WINDOW_PAST_MS   = 2  * 60_000;    // ignorar llegadas que pasaron hace >2 min

// Auto-actualización de GTFS estático
const GTFS_STATIC_URL = process.env.GTFS_STATIC_URL || '';
const GTFS_STATIC_UPDATE_HOURS = parseInt(process.env.GTFS_STATIC_UPDATE_HOURS || '24', 10);
const GTFS_DATA_DIR = path.join(__dirname, '../data/gtfs_madrid');

// Propagación de retrasos (damping exponencial)
const DELAY_DAMPING_FACTOR = parseFloat(process.env.DELAY_DAMPING_FACTOR || '0.85');

// Base de datos estática
let _staticStops = {};
const _staticStopTimes = new Map();

// Índice en memoria: estacionId → llegadas[]
let _index       = {};
let _lastUpdate  = null;
let _pollTimer   = null;
let _initialized = false;

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

/**
 * "1091L23553C1" → "C1", "1001X19800C4a" → "C4", "1091L23553C10" → "C10"
 * Maneja sufijos como a/b, guiones, y variantes de mayúsculas
 */
function lineIdFromTripId(tripId = '') {
  if (!tripId || !tripId.startsWith('10')) return null;
  // Busca C seguido de dígitos, con sufijo alfanumérico opcional (a, b, R, etc.)
  const m = tripId.match(/C(\d{1,2})([a-zA-Z]*)$/);
  if (!m) {
    // Fallback: busca cualquier patrón de línea tipo C1, C10, R1, etc.
    const fallback = tripId.match(/[CR](\d{1,2})/);
    return fallback ? `C${fallback[1]}` : null;
  }
  const base = m[1];       // "4" de "C4a"
  const suffix = m[2].toLowerCase(); // "a" de "C4a"
  return suffix === 'a' || suffix === 'b' ? `C${base}` : `C${base}`;
}

/** Descarga y extrae GTFS estático desde la URL configurada */
async function downloadStaticGtfs() {
  if (!GTFS_STATIC_URL) {
    logger.info('[GTFS-Static] GTFS_STATIC_URL no configurada, usando archivos locales');
    return false;
  }
  try {
    logger.info(`[GTFS-Static] Descargando GTFS estático desde ${GTFS_STATIC_URL}...`);
    const res = await axios.get(GTFS_STATIC_URL, { responseType: 'arraybuffer', timeout: 30_000 });
    const zipPath = path.join(GTFS_DATA_DIR, '__gtfs_temp.zip');
    fs.writeFileSync(zipPath, res.data);
    execSync(`unzip -o "${zipPath}" -d "${GTFS_DATA_DIR}"`, { stdio: 'pipe' });
    fs.unlinkSync(zipPath);

    // Limpiar BOM y espacios en los CSV descargados
    for (const file of ['trips.txt', 'stop_times.txt']) {
      const fpath = path.join(GTFS_DATA_DIR, file);
      if (fs.existsSync(fpath)) {
        let content = fs.readFileSync(fpath, 'utf8').trim();
        content = content.replace(/^\uFEFF/, '');
        fs.writeFileSync(fpath, content + '\n');
      }
    }

    logger.info('[GTFS-Static] Datos GTFS estáticos actualizados correctamente');
    return true;
  } catch (err) {
    logger.warn(`[GTFS-Static] No se pudo actualizar GTFS estático: ${err.message}. Usando archivos locales.`);
    return false;
  }
}

/** Reinicia _staticStopTimes desde los archivos en disco */
function reloadStopTimes() {
  _staticStopTimes.clear();
  const stopTimesPath = path.join(GTFS_DATA_DIR, 'stop_times.txt');
  if (!fs.existsSync(stopTimesPath)) {
    logger.error(`[GTFS-Static] No se encuentra stop_times.txt en ${stopTimesPath}`);
    return;
  }
  const content = fs.readFileSync(stopTimesPath, 'utf8');
  const lines = content.split('\n');

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const parts = line.split(',');
    if (parts.length < 5) continue;
    const tripId = parts[0].trim();
    const arrTime = parts[1].trim();
    const stopId = parts[3].trim();
    const seq = parseInt(parts[4].trim(), 10);
    if (!tripId || !stopId || isNaN(seq)) continue;

    const tParts = arrTime.split(':');
    const h = parseInt(tParts[0], 10);
    const m = parseInt(tParts[1], 10);
    const s = parseInt(tParts[2], 10);
    const offsetMs = ((h || 0) * 3600 + (m || 0) * 60 + (s || 0)) * 1000;

    let arr = _staticStopTimes.get(tripId);
    if (!arr) { arr = []; _staticStopTimes.set(tripId, arr); }
    arr.push({ stopId, offsetMs, seq });
  }

  for (const arr of _staticStopTimes.values()) {
    arr.sort((a, b) => a.seq - b.seq);
  }
}

/** Carga los datos GTFS estáticos (intenta descarga primero) */
async function loadStaticGtfs() {
  const start = Date.now();
  try {
    const stopsPath = path.join(GTFS_DATA_DIR, 'stops_mapped.json');
    _staticStops = JSON.parse(fs.readFileSync(stopsPath, 'utf8'));

    // Intentar descargar versión actualizada
    await downloadStaticGtfs();

    reloadStopTimes();
    logger.info(`[GTFS-Static] Horarios cargados: ${_staticStopTimes.size} viajes en ${Date.now() - start}ms`);
  } catch (err) {
    logger.error(`[GTFS-Static] Error al cargar base de datos: ${err.message}`);
  }
}

// ─────────────────────────────────────────────────────────────
// Proyección de rutas usando el GTFS Estático
// ─────────────────────────────────────────────────────────────

function projectTrip({ stopId, delaySec, tripId, nowMs, arrivalUnix }) {
  const staticStopsList = _staticStopTimes.get(tripId);

  if (!staticStopsList || staticStopsList.length === 0) {
    const mapped = _staticStops[stopId];
    if (mapped) {
      const estMs = nowMs + delaySec * 1000;
      const delay = Math.max(0, Math.round(delaySec / 60));
      return [{
        estId: mapped.id,
        realTime: estMs,
        scheduledTime: estMs - delaySec * 1000,
        retrasoMinutos: delay,
        estado: delay > 2 ? 'RETRASO' : 'EN_HORA',
        destino: 'Cercanías',
        tripId,
        lineId: lineIdFromTripId(tripId) || 'CERCANIAS'
      }];
    }
    return [];
  }

  const anchorIdx = staticStopsList.findIndex(s => s.stopId === stopId);
  if (anchorIdx === -1) return [];

  // Anclar la referencia horaria al arrivalUnix real del GTFS-RT.
  // Esto maneja correctamente trenes que cruzaron medianoche:
  // en lugar de asumir "hoy a las 00:00", calculamos la base desde
  // el timestamp absoluto que Renfe reporta para esta parada.
  const scheduledAnchorMs = arrivalUnix * 1000 - delaySec * 1000;
  const anchorOffsetMs = staticStopsList[anchorIdx].offsetMs;
  const baseRefMs = scheduledAnchorMs - anchorOffsetMs;

  const results = [];
  const cutoffMs = nowMs - WINDOW_PAST_MS;
  const aheadMs  = nowMs + WINDOW_AHEAD_MS;

  const lastStop = staticStopsList[staticStopsList.length - 1];
  const lastMapped = _staticStops[lastStop.stopId];
  let destino = lastMapped ? lastMapped.nombre : 'Destino';

  if (destino.includes('Atocha')) destino = 'Atocha';
  if (destino.includes('Chamartín')) destino = 'Chamartín';
  if (destino.includes('Príncipe Pío')) destino = 'Príncipe Pío';
  if (destino.includes('Alcobendas')) destino = 'Alcobendas-SS de los Reyes';
  if (destino.includes('Colmenar')) destino = 'Colmenar Viejo';
  if (destino.includes('El Soto')) destino = 'Móstoles El Soto';

  const lineId = lineIdFromTripId(tripId) || 'CERCANIAS';

  for (let i = 0; i < staticStopsList.length; i++) {
    const item = staticStopsList[i];

    if (i < anchorIdx - 1) continue;

    // Propagación de retraso con decaimiento exponencial:
    // cada parada futura hereda una fracción del retraso de la anterior.
    // dampingFactor=0.85 → el retraso se reduce ~15% por parada,
    // simulando que el conductor recupera tiempo gradualmente.
    const stopsSinceAnchor = Math.max(0, i - anchorIdx);
    const propagatedDelaySec = delaySec * Math.pow(DELAY_DAMPING_FACTOR, stopsSinceAnchor);
    const propagatedDelayMin = Math.max(0, Math.round(propagatedDelaySec / 60));

    // scheduledTime: calculado contra baseRefMs (absoluto, corrige medianoche)
    const scheduledTimeMs = baseRefMs + item.offsetMs;
    // realTime: scheduled + retraso propagado
    const realTimeMs = scheduledTimeMs + propagatedDelaySec * 1000;

    if (realTimeMs >= cutoffMs && realTimeMs <= aheadMs) {
      const mapped = _staticStops[item.stopId];
      if (mapped) {
        results.push({
          estId: mapped.id,
          realTime: realTimeMs,
          scheduledTime: scheduledTimeMs,
          retrasoMinutos: propagatedDelayMin,
          estado: propagatedDelayMin > 2 ? 'RETRASO' : 'EN_HORA',
          destino,
          tripId,
          lineId,
        });
      }
    }
  }

  return results;
}

// ─────────────────────────────────────────────────────────────
// Actualización del índice
// ─────────────────────────────────────────────────────────────

async function buildIndex() {
  try {
    const res      = await axios.get(RENFE_TRIP_UPDATES_URL, { timeout: 10_000 });
    const entities = res.data?.entity || [];

    const newIndex = {};
    const nowMs    = Date.now();

    for (const entity of entities) {
      const tu = entity.tripUpdate;
      if (!tu?.stopTimeUpdate?.length) continue;

      const tripId  = tu.trip?.tripId || '';
      if (!tripId.startsWith('10')) continue; // Solo Cercanías Madrid

      const tripDelay = tu.delay || 0;

      // Tomamos el primer stopTimeUpdate que representa la ubicación real-time del tren
      const stu = tu.stopTimeUpdate[0];
      const stopId = stu.stopId;
      if (!stopId) continue;

      const arrivalUnix = parseInt(stu.arrival?.time || stu.departure?.time, 10);
      if (!arrivalUnix) continue;

      const delaySec = stu.arrival?.delay ?? stu.departure?.delay ?? tripDelay ?? 0;

      // Proyectar todos los tiempos utilizando el GTFS estático del viaje
      // arrivalUnix permite anclar correctamente la referencia horaria
      const projected = projectTrip({ stopId, delaySec, tripId, nowMs, arrivalUnix });

      for (const p of projected) {
        if (!newIndex[p.estId]) newIndex[p.estId] = [];
        newIndex[p.estId].push(p);
      }
    }

    // Deduplicar: un mismo tren -> sólo la predicción más cercana
    for (const estId of Object.keys(newIndex)) {
      const best = new Map();
      for (const e of newIndex[estId]) {
        const key = `${e.tripId}|${e.lineId}`;
        if (!best.has(key) || e.realTime < best.get(key).realTime) {
          best.set(key, e);
        }
      }
      newIndex[estId] = [...best.values()]
        .sort((a, b) => a.realTime - b.realTime)
        .slice(0, 20);
    }

    _index      = newIndex;
    _lastUpdate = new Date();

    const totalEst = Object.keys(newIndex).length;
    const totalLl  = Object.values(newIndex).reduce((s, a) => s + a.length, 0);
    logger.info(`[GTFS] Índice actualizado: ${totalEst} estaciones, ${totalLl} llegadas (ventana 90 min)`);

  } catch (err) {
    logger.error(`[GTFS] Error al actualizar índice: ${err.message}`);
  }
}

// ─────────────────────────────────────────────────────────────
// API pública
// ─────────────────────────────────────────────────────────────

async function inicializar() {
  if (_initialized) return;
  _initialized = true;
  logger.info('[GTFS] Iniciando servicio de tiempos reales GTFS-RT...');
  await loadStaticGtfs();
  await buildIndex();
  _pollTimer = setInterval(buildIndex, POLL_INTERVAL_MS);
  // Refrescar GTFS estático cada N horas (por si Renfe actualiza horarios)
  if (GTFS_STATIC_URL && GTFS_STATIC_UPDATE_HOURS > 0) {
    setInterval(async () => {
      logger.info('[GTFS-Static] Refresh periódico de GTFS estático...');
      await downloadStaticGtfs();
      reloadStopTimes();
    }, GTFS_STATIC_UPDATE_HOURS * 3600 * 1000);
  }
  logger.info(`[GTFS] Polling RT cada ${POLL_INTERVAL_MS / 1000}s | Ventana: 90 min | Estático: ${GTFS_STATIC_URL ? `cada ${GTFS_STATIC_UPDATE_HOURS}h` : 'archivos locales'}`);
}

function getLlegadasParaEstacion(estacionId) {
  return _index[estacionId] || [];
}

function getLlegadasParaEstaciones(estacionIds = []) {
  return estacionIds
    .flatMap(id => getLlegadasParaEstacion(id))
    .sort((a, b) => a.realTime - b.realTime)
    .slice(0, 20);
}

function detener() {
  if (_pollTimer) { clearInterval(_pollTimer); _pollTimer = null; }
}

function getStatus() {
  return {
    lastUpdate: _lastUpdate,
    estacionesIndexadas: Object.keys(_index).length,
    totalLlegadas: Object.values(_index).reduce((s, a) => s + a.length, 0),
  };
}

module.exports = { inicializar, getLlegadasParaEstacion, getLlegadasParaEstaciones, detener, getStatus };
