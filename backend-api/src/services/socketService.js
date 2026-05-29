/**
 * socketService.js - WebSockets con Socket.io
 * Madrid Transit Pulse: Backend API (compatible con mock y producción)
 */

const { Server } = require('socket.io');
const logger = require('../config/logger');

let io               = null;
let pollingInterval  = null;
let clientesConectados = 0;
let ultimoTimestampAlerta = null;

// Repositorios inyectados desde server.js
let _TransitAlert;
let _VehicleStatus;

/**
 * Inicializa el servidor Socket.io.
 *
 * @param {import('http').Server} httpServer
 * @param {object} TransitAlert  - Repositorio de alertas (mock o Mongoose)
 * @param {object} VehicleStatus - Repositorio de vehículos (mock o Mongoose)
 * @param {EventEmitter|null} dbEvents - Emisor de eventos del mock (null en producción)
 */
const iniciarSocketServer = (httpServer, TransitAlert, VehicleStatus, dbEvents) => {
  _TransitAlert  = TransitAlert;
  _VehicleStatus = VehicleStatus;

  logger.info('🔌 Inicializando servidor Socket.io...');

  io = new Server(httpServer, {
    cors: {
      origin: (process.env.CORS_ORIGINS || 'http://localhost:3000').split(','),
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 20000,
    pingInterval: 10000,
  });

  io.on('connection', (socket) => {
    clientesConectados++;
    logger.info(`🟢 Cliente conectado: ${socket.id} | Total: ${clientesConectados}`);
    enviarEstadoInicial(socket);

    socket.on('subscribe-line', (lineId) => {
      if (!lineId || typeof lineId !== 'string') return;
      socket.join(`line-${lineId.toUpperCase()}`);
      logger.debug(`📌 ${socket.id} suscrito a línea: ${lineId}`);
      socket.emit('subscription-confirmed', { lineId });
    });

    socket.on('unsubscribe-line', (lineId) => {
      if (lineId) socket.leave(`line-${lineId.toUpperCase()}`);
    });

    socket.on('disconnect', (reason) => {
      clientesConectados--;
      logger.info(`🔴 Cliente desconectado: ${socket.id} (${reason}) | Total: ${clientesConectados}`);
    });

    socket.on('error', (err) => logger.error(`❌ Socket error ${socket.id}: ${err.message}`));
  });

  // Si hay mockDb, escuchar sus eventos directamente (más eficiente que polling)
  if (dbEvents) {
    dbEvents.on('nuevas_alertas', (alertasNuevas) => {
      if (clientesConectados === 0) return;
      io.emit('transit-update', {
        tipo:      'nuevas_alertas',
        timestamp: new Date().toISOString(),
        cantidad:  alertasNuevas.length,
        alertas:   alertasNuevas,
      });
      // Emitir a rooms de líneas específicas
      const lineas = [...new Set(alertasNuevas.map(a => a.lineId))];
      lineas.forEach(lineId => {
        io.to(`line-${lineId}`).emit('line-alert', {
          lineId,
          alertas: alertasNuevas.filter(a => a.lineId === lineId),
        });
      });
      logger.debug(`📡 ${alertasNuevas.length} alertas emitidas vía mockDb events`);
    });

    dbEvents.on('vehiculos_actualizados', (vehiculos) => {
      if (clientesConectados === 0) return;
      io.emit('vehicle-update', { timestamp: new Date().toISOString(), vehiculos });
      logger.debug(`🗺️  ${vehiculos.length} vehículos actualizados emitidos`);
    });
  } else {
    // Producción: polling clásico
    iniciarPolling();
  }

  logger.info('✅ Servidor Socket.io listo');
  return io;
};

// ============================================================
// Estado inicial al conectar
// ============================================================
const enviarEstadoInicial = async (socket) => {
  try {
    const [alertas, vehiculos, stats] = await Promise.all([
      _TransitAlert.obtenerRecientes({}, 200),
      _VehicleStatus.find().sort({ tieneAlerta: -1 }).limit(1000).lean(),
      obtenerStats(),
    ]);

    socket.emit('transit-update', {
      tipo:      'estado_inicial',
      timestamp: new Date().toISOString(),
      alertas,
      vehiculos,
    });

    socket.emit('stats-update', { timestamp: new Date().toISOString(), stats });
    logger.debug(`📤 Estado inicial enviado a ${socket.id}`);
  } catch (err) {
    logger.error(`❌ Error enviando estado inicial: ${err.message}`);
  }
};

// ============================================================
// Polling para producción (MongoDB real)
// ============================================================
const iniciarPolling = () => {
  const intervaloMs = parseInt(process.env.ALERTS_POLL_INTERVAL_MS) || 5000;
  let ciclo = 0;

  pollingInterval = setInterval(async () => {
    if (clientesConectados === 0) return;
    ciclo++;

    try {
      const filtro = ultimoTimestampAlerta
        ? { detectedAt: { $gt: ultimoTimestampAlerta } } : {};
      const nuevas = await _TransitAlert.find(filtro).sort({ detectedAt: -1 }).limit(20).lean();

      if (nuevas.length > 0) {
        ultimoTimestampAlerta = nuevas[0].detectedAt;
        io.emit('transit-update', {
          tipo:      'nuevas_alertas',
          timestamp: new Date().toISOString(),
          cantidad:  nuevas.length,
          alertas:   nuevas,
        });
      }

      if (ciclo % 3 === 0) {
        const vehiculos = await _VehicleStatus.find().sort({ tieneAlerta: -1 }).limit(200).lean();
        if (vehiculos.length > 0) {
          io.emit('vehicle-update', { timestamp: new Date().toISOString(), vehiculos });
        }
      }

      if (ciclo % 6 === 0) {
        const stats = await obtenerStats();
        io.emit('stats-update', { timestamp: new Date().toISOString(), stats });
      }
    } catch (err) {
      logger.error(`❌ Error en ciclo polling: ${err.message}`);
    }
  }, intervaloMs);
};

// ============================================================
// Helpers
// ============================================================
const obtenerStats = async () => {
  const [conteo, totalV, conAlerta] = await Promise.all([
    _TransitAlert.contarPorSeveridad(),
    _VehicleStatus.countDocuments(),
    _VehicleStatus.countDocuments({ tieneAlerta: true }),
  ]);
  return {
    totalVehiculos: totalV,
    vehiculosConAlerta: conAlerta,
    alertasPorSeveridad: conteo.reduce((acc, s) => { acc[s._id] = s.count; return acc; },
      { ALTA: 0, MEDIA: 0, BAJA: 0 }),
  };
};

const detenerSocketServer = () => {
  if (pollingInterval) { clearInterval(pollingInterval); }
  if (io) { io.close(); logger.info('🔒 Socket.io cerrado'); }
};

const getClientesConectados = () => clientesConectados;

module.exports = { iniciarSocketServer, detenerSocketServer, getClientesConectados };
