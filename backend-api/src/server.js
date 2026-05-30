/**
 * server.js - Punto de entrada del Backend API
 * Madrid Transit Pulse
 *
 * En modo desarrollo (sin MongoDB) usa mockDb.js para simular datos.
 * En producción conecta a MongoDB real.
 */

require('dotenv').config();

const express   = require('express');
const http      = require('http');
const cors      = require('cors');
const helmet    = require('helmet');
const morgan    = require('morgan');
const rateLimit = require('express-rate-limit');

const logger = require('./config/logger');

// ============================================================
// Determinar modo: real MongoDB vs. simulación en memoria
// ============================================================
const USE_MOCK = process.env.USE_MOCK === 'true' || !process.env.MONGO_URI ||
                 process.env.MONGO_URI.includes('PLACEHOLDER');

if (USE_MOCK) {
  logger.warn('🗃️  Modo MOCK activo: usando base de datos en memoria (sin MongoDB)');
}

// ============================================================
// Inicializar Express
// ============================================================
const app = express();

app.use(helmet({ contentSecurityPolicy: false }));

app.use(cors({
  origin: (process.env.CORS_ORIGINS || 'http://localhost:3000').split(','),
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.use(rateLimit({
  windowMs: 60000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Demasiadas peticiones.' },
}));

app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev', {
  stream: { write: (msg) => logger.http(msg.trim()) },
}));

// ============================================================
// Cargar rutas (inyectando el repo correcto según el modo)
// ============================================================

// Importar módulos del dominio (mock o real)
let TransitAlert, VehicleStatus, dbEvents, generarHorarioEstacion;

if (USE_MOCK) {
  const mock = require('./services/mockDb');
  mock.inicializar();
  TransitAlert  = mock.MockTransitAlert;
  VehicleStatus = mock.MockVehicleStatus;
  dbEvents      = mock.dbEvents;
  generarHorarioEstacion = mock.generarHorarioEstacion;
} else {
  const { connectDB } = require('./config/database');
  connectDB();
  TransitAlert  = require('./models/TransitAlert');
  VehicleStatus = require('./models/VehicleStatus');
  dbEvents      = null; // en producción se usa Change Streams
}

// Inyectar en el contexto de la app para que las rutas lo usen
app.locals.TransitAlert  = TransitAlert;
app.locals.VehicleStatus = VehicleStatus;

// Rutas REST
const buildRoutes = require('./routes/statusRoutes');
app.use('/api', buildRoutes(TransitAlert, VehicleStatus, generarHorarioEstacion));

// Ruta raíz
app.get('/', (req, res) => res.json({
  nombre:  'Madrid Transit Pulse - Backend API',
  version: '1.0.0',
  modo:    USE_MOCK ? 'mock (sin MongoDB)' : 'producción',
  endpoints: {
    status: 'GET /api/status',
    alerts: 'GET /api/alerts',
    lines:  'GET /api/lines',
    stats:  'GET /api/stats',
    health: 'GET /api/health',
  },
}));

// 404
app.use((req, res) => {
  res.status(404).json({ ok: false, error: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
});

// Error handler
app.use((err, req, res, _next) => {
  logger.error(`❌ ${err.message}`);
  res.status(500).json({ ok: false, error: 'Error interno del servidor' });
});

// ============================================================
// Servidor HTTP + Socket.io
// ============================================================
const httpServer = http.createServer(app);
const { iniciarSocketServer, detenerSocketServer } = require('./services/socketService');
iniciarSocketServer(httpServer, TransitAlert, VehicleStatus, dbEvents);

// ============================================================
// Arranque
// ============================================================
const PORT = parseInt(process.env.PORT) || 3001;

httpServer.listen(PORT, () => {
  logger.info('================================================');
  logger.info('🚇 Madrid Transit Pulse - Backend API');
  logger.info('================================================');
  logger.info(`🌐 HTTP:      http://localhost:${PORT}`);
  logger.info(`🔌 WS:        ws://localhost:${PORT}`);
  logger.info(`📊 Health:    http://localhost:${PORT}/api/health`);
  logger.info(`🗃️  Modo:      ${USE_MOCK ? 'MOCK (simulación)' : 'MongoDB real'}`);
  logger.info('================================================');
});

// Graceful shutdown
const apagar = () => {
  logger.info('🛑 Apagando servidor...');
  detenerSocketServer();
  httpServer.close(() => { logger.info('✅ Apagado limpio'); process.exit(0); });
  setTimeout(() => process.exit(1), 8000);
};
process.on('SIGTERM', apagar);
process.on('SIGINT',  apagar);

module.exports = { app, httpServer };
