/**
 * ingestionController.js - Control de actividad de la ingesta en segundo plano
 * Madrid Transit Pulse: Backend API
 *
 * Objetivo: que la app NO consuma recursos cuando nadie la usa.
 *
 * Los workers de ingesta (mockDb, gtfsService, polling de Socket.io) se
 * registran aquí. Solo se arrancan cuando hay actividad (al menos un cliente
 * WebSocket o una petición REST) y se paran tras un periodo de gracia sin
 * actividad. Así, en reposo el proceso queda en CPU ~0 y permite que Railway
 * duerma el servicio (Serverless / App Sleeping).
 */

'use strict';

const logger = require('../config/logger');

// Tiempo de gracia antes de apagar los workers cuando no queda nadie.
// Da margen a recargas de página / reconexiones del WebSocket.
const IDLE_GRACE_MS = parseInt(process.env.INGEST_IDLE_GRACE_MS || '120000', 10);

const workers = [];
let activeClients = 0;
let idleTimer = null;
let running = false;

/** Registra un worker con métodos start()/stop() que se invocan según actividad. */
function register(worker) {
  if (!worker || typeof worker.start !== 'function') return;
  workers.push(worker);
}

function startAll() {
  if (running) return;
  running = true;
  logger.info(`⚡ [Ingesta] Actividad detectada: arrancando ${workers.length} worker(s)`);
  for (const worker of workers) {
    try {
      worker.start();
    } catch (err) {
      logger.error(`[Ingesta] Error arrancando worker: ${err.message}`);
    }
  }
}

function stopAll() {
  if (!running) return;
  running = false;
  logger.info('💤 [Ingesta] Sin actividad: parando workers');
  for (const worker of workers) {
    try {
      if (typeof worker.stop === 'function') worker.stop();
    } catch (err) {
      logger.error(`[Ingesta] Error parando worker: ${err.message}`);
    }
  }
}

function clearIdleTimer() {
  if (idleTimer) {
    clearTimeout(idleTimer);
    idleTimer = null;
  }
}

function scheduleIdleStop() {
  clearIdleTimer();
  idleTimer = setTimeout(() => {
    idleTimer = null;
    if (activeClients === 0) stopAll();
  }, IDLE_GRACE_MS);
  if (typeof idleTimer.unref === 'function') idleTimer.unref();
}

/** Un cliente WebSocket se ha conectado. */
function clienteConectado() {
  activeClients++;
  clearIdleTimer();
  startAll();
}

/** Un cliente WebSocket se ha desconectado. */
function clienteDesconectado() {
  activeClients = Math.max(0, activeClients - 1);
  if (activeClients === 0) scheduleIdleStop();
}

/**
 * Marca actividad sin ser un WebSocket (p. ej. una petición REST directa al
 * backend). Arranca los workers y programa su parada si no hay clientes.
 */
function touch() {
  startAll();
  if (activeClients === 0) scheduleIdleStop();
}

function estadisticas() {
  return { activeClients, running, workers: workers.length };
}

module.exports = { register, clienteConectado, clienteDesconectado, touch, stopAll, estadisticas };
