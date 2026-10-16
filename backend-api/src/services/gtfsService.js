/**
 * gtfsService.js — Tiempos reales de Cercanías Madrid basados en GTFS Estático + RT
 *
 * Cómo funciona (idéntico a Google Maps):
 *  1. Al iniciar (primera vez que hay actividad), carga el horario oficial estático
 *     de Madrid (stop_times.txt, trips.txt)
 *  2. Descarga el feed GTFS-RT de Renfe cada 20 segundos
 *  3. Por cada tren activo, busca su tripId en el horario oficial
 *  4. Si existe, aplica el retraso real actual a cada una de sus paradas programadas
 *  5. Esto genera predicciones 100% exactas para cada estación de su recorrido.
 *
 * Optimización de memoria: el horario estático NO se guarda como un objeto por
 * parada (eran ~400.000 objetos). Se compacta a un string de stopIds + un
 * Int32Array de offsets por viaje, reduciendo el uso de RAM de ~150 MB a unos pocos.
 */

'use strict';

const fs     = require('fs');
const path   = require('path');
const axios  = require('axios');
const { execSync } = require('child_process');
const logger = require('../config/logger');

// Configuración
const RENFE_TRIP_UPDATES_URL = 'https://gtfsrt.renfe.com/trip_updates.json';
const POLL_INTERVAL_MS = parseInt(process.env.GTFS_POLL_INTERVAL_MS || '20000', 10);
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
// Representación compacta: tripId -> { ids: "stopA,stopB,...", offs: Int32Array }
let _tripStops = new Map();

// Índice en memoria: estacionId → llegadas[]
let _index       = {};
let _lastUpdate  = null;
let _pollTimer   = null;
let _staticTimer = null;
let _ready       = false;

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
    logger.debug('[GTFS-Static] GTFS_STATIC_URL no configurada, usando archivos locales');
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

/**
 * Compila stop_times.txt a una representación compacta en memoria.
 *
 * Formato de cada línea: trip_id,arrival_time,departure_time,stop_id,stop_sequence
 * El fichero (~58 MB) se lee por chunks como bytes y se vuelca cada viaje en cuanto
 * cambia el trip_id (el fichero está agrupado por trip_id). Trabajar sobre bytes y
 * extraer campos con Buffer.toString evita crear cadenas "sliced" que retendrían
 * los chunks enteros en memoria. Resultado: tripId -> { ids, offs }.
 */
function buildTripStops() {
  const stopTimesPath = path.join(GTFS_DATA_DIR, 'stop_times.txt');
  if (!fs.existsSync(stopTimesPath)) {
    logger.error(`[GTFS-Static] No se encuentra stop_times.txt en ${stopTimesPath}`);
    return;
  }

  const COMMA = 44; // ','
  const NL = 10;    // '\n'
  const CHUNK = 1 << 20; // 1 MB
  const buf = Buffer.allocUnsafe(CHUNK);
  const fd = fs.openSync(stopTimesPath, 'r');

  const compact = new Map();
  let curTripId = null;
  let curIds = [];
  let curOffs = [];
  let curSeqs = [];

  const flush = () => {
    if (curTripId === null) return;
    const n = curSeqs.length;
    const order = new Array(n);
    for (let k = 0; k < n; k++) order[k] = k;
    order.sort((a, b) => curSeqs[a] - curSeqs[b]);
    const ids = new Array(n);
    const offs = new Int32Array(n);
    for (let k = 0; k < n; k++) {
      const idx = order[k];
      ids[k] = curIds[idx];
      offs[k] = curOffs[idx];
    }
    compact.set(curTripId, { ids: ids.join(','), offs });
    curTripId = null; curIds = []; curOffs = []; curSeqs = [];
  };

  // Procesa una línea contenida en los bytes [start, end) de `b`.
  const onLine = (b, start, end) => {
    let c1 = -1, c2 = -1, c3 = -1, c4 = -1, c5 = -1;
    let count = 0;
    for (let i = start; i < end; i++) {
      if (b[i] === COMMA) {
        count++;
        if (count === 1) c1 = i;
        else if (count === 2) c2 = i;
        else if (count === 3) c3 = i;
        else if (count === 4) c4 = i;
        else { c5 = i; break; }
      }
    }
    if (c4 === -1) return;

    const tripId = b.toString('utf8', start, c1);
    const arrTime = b.toString('utf8', c1 + 1, c2);
    const stopId = b.toString('utf8', c3 + 1, c4);
    const seqStr = b.toString('utf8', c4 + 1, c5 === -1 ? end : c5);
    const seq = parseInt(seqStr, 10);
    if (!tripId || !stopId || isNaN(seq)) return;

    if (tripId !== curTripId) { flush(); curTripId = tripId; }

    // arrival_time "HH:MM:SS" (puede pasar de 24:00 en servicios nocturnos)
    const t1 = arrTime.indexOf(':');
    const t2 = arrTime.indexOf(':', t1 + 1);
    const h = parseInt(arrTime.slice(0, t1), 10) || 0;
    const m = parseInt(arrTime.slice(t1 + 1, t2), 10) || 0;
    const s = parseInt(arrTime.slice(t2 + 1), 10) || 0;

    curIds.push(stopId);
    curOffs.push((h * 3600 + m * 60 + s) * 1000);
    curSeqs.push(seq);
  };

  let pending = null;
  let firstLine = true;
  try {
    let bytesRead;
    while ((bytesRead = fs.readSync(fd, buf, 0, CHUNK, null)) > 0) {
      // Vista de bytes del chunk actual (+ resto parcial anterior si lo hay)
      let chunk;
      if (pending) {
        chunk = Buffer.concat([pending, buf.subarray(0, bytesRead)]);
        pending = null;
      } else {
        chunk = buf.subarray(0, bytesRead);
      }

      let start = 0;
      let idx = chunk.indexOf(NL, start);
      while (idx !== -1) {
        if (firstLine) firstLine = false;
        else onLine(chunk, start, idx);
        start = idx + 1;
        idx = chunk.indexOf(NL, start);
      }
      // Guardar la línea parcial pendiente (copia: `buf` se reutiliza)
      if (start < chunk.length) pending = Buffer.from(chunk.subarray(start));
    }
    if (pending && pending.length && !firstLine) {
      onLine(pending, 0, pending.length);
    }
  } finally {
    fs.closeSync(fd);
  }

  flush();
  _tripStops = compact;
}

/** Carga los datos GTFS estáticos (intenta descarga primero) */
async function loadStaticGtfs() {
  const start = Date.now();
  try {
    const stopsPath = path.join(GTFS_DATA_DIR, 'stops_mapped.json');
    _staticStops = JSON.parse(fs.readFileSync(stopsPath, 'utf8'));

    // Intentar descargar versión actualizada
    await downloadStaticGtfs();

    buildTripStops();
    logger.info(`[GTFS-Static] Horarios cargados: ${_tripStops.size} viajes en ${Date.now() - start}ms`);
  } catch (err) {
    logger.error(`[GTFS-Static] Error al cargar base de datos: ${err.message}`);
  }
}

// ─────────────────────────────────────────────────────────────
// Proyección de rutas usando el GTFS Estático
// ─────────────────────────────────────────────────────────────

function projectTrip({ stopId, delaySec, tripId, nowMs, arrivalUnix }) {
  const entry = _tripStops.get(tripId);

  if (!entry || entry.offs.length === 0) {
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

  const ids = entry.ids.split(',');
  const offs = entry.offs;

  const anchorIdx = ids.indexOf(stopId);
  if (anchorIdx === -1) return [];

  // Anclar la referencia horaria al arrivalUnix real del GTFS-RT.
  // Esto maneja correctamente trenes que cruzaron medianoche:
  // en lugar de asumir "hoy a las 00:00", calculamos la base desde
  // el timestamp absoluto que Renfe reporta para esta parada.
  const scheduledAnchorMs = arrivalUnix * 1000 - delaySec * 1000;
  const anchorOffsetMs = offs[anchorIdx];
  const baseRefMs = scheduledAnchorMs - anchorOffsetMs;

  const results = [];
  const cutoffMs = nowMs - WINDOW_PAST_MS;
  const aheadMs  = nowMs + WINDOW_AHEAD_MS;

  const lastStopId = ids[ids.length - 1];
  const lastMapped = _staticStops[lastStopId];
  let destino = lastMapped ? lastMapped.nombre : 'Destino';

  if (destino.includes('Atocha')) destino = 'Atocha';
  if (destino.includes('Chamartín')) destino = 'Chamartín';
  if (destino.includes('Príncipe Pío')) destino = 'Príncipe Pío';
  if (destino.includes('Alcobendas')) destino = 'Alcobendas-SS de los Reyes';
  if (destino.includes('Colmenar')) destino = 'Colmenar Viejo';
  if (destino.includes('El Soto')) destino = 'Móstoles El Soto';

  const lineId = lineIdFromTripId(tripId) || 'CERCANIAS';

  for (let i = 0; i < ids.length; i++) {
    if (i < anchorIdx - 1) continue;

    // Propagación de retraso con decaimiento exponencial:
    // cada parada futura hereda una fracción del retraso de la anterior.
    // dampingFactor=0.85 → el retraso se reduce ~15% por parada,
    // simulando que el conductor recupera tiempo gradualmente.
    const stopsSinceAnchor = Math.max(0, i - anchorIdx);
    const propagatedDelaySec = delaySec * Math.pow(DELAY_DAMPING_FACTOR, stopsSinceAnchor);
    const propagatedDelayMin = Math.max(0, Math.round(propagatedDelaySec / 60));

    // scheduledTime: calculado contra baseRefMs (absoluto, corrige medianoche)
    const scheduledTimeMs = baseRefMs + offs[i];
    // realTime: scheduled + retraso propagado
    const realTimeMs = scheduledTimeMs + propagatedDelaySec * 1000;

    if (realTimeMs >= cutoffMs && realTimeMs <= aheadMs) {
      const mapped = _staticStops[ids[i]];
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
    logger.debug(`[GTFS] Índice actualizado: ${totalEst} estaciones, ${totalLl} llegadas (ventana 90 min)`);

  } catch (err) {
    logger.error(`[GTFS] Error al actualizar índice: ${err.message}`);
  }
}

// ─────────────────────────────────────────────────────────────
// Ciclo de vida (start/stop segun actividad)
// ─────────────────────────────────────────────────────────────

async function inicializar() {
  if (_ready) return;
  _ready = true;
  logger.info('[GTFS] Iniciando servicio de tiempos reales GTFS-RT...');
  await loadStaticGtfs();
  await buildIndex();
}

/** Arranca el polling. Carga el estático la primera vez (perezoso). */
async function start() {
  await inicializar();
  if (!_pollTimer) {
    _pollTimer = setInterval(buildIndex, POLL_INTERVAL_MS);
    logger.info(`[GTFS] Polling RT cada ${POLL_INTERVAL_MS / 1000}s | Estático: ${GTFS_STATIC_URL ? `cada ${GTFS_STATIC_UPDATE_HOURS}h` : 'archivos locales'}`);
  }
  if (!_staticTimer && GTFS_STATIC_URL && GTFS_STATIC_UPDATE_HOURS > 0) {
    _staticTimer = setInterval(async () => {
      logger.info('[GTFS-Static] Refresh periódico de GTFS estático...');
      await downloadStaticGtfs();
      buildTripStops();
    }, GTFS_STATIC_UPDATE_HOURS * 3600 * 1000);
  }
}

/** Detiene el polling (no libera la base estática, ya es compacta). */
function stop() {
  if (_pollTimer) { clearInterval(_pollTimer); _pollTimer = null; }
  if (_staticTimer) { clearInterval(_staticTimer); _staticTimer = null; }
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

function getStatus() {
  return {
    lastUpdate: _lastUpdate,
    estacionesIndexadas: Object.keys(_index).length,
    totalLlegadas: Object.values(_index).reduce((s, a) => s + a.length, 0),
    viajesCargados: _tripStops.size,
  };
}

module.exports = {
  start,
  stop,
  detener: stop,
  inicializar,
  getLlegadasParaEstacion,
  getLlegadasParaEstaciones,
  getStatus,
};
