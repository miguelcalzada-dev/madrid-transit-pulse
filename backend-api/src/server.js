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

// Origenes permitidos: lista blanca explicita (CORS_ORIGINS separado por comas).
// IMPORTANTE: no se permiten comodines por subdominio (*.vercel.app, *.railway.app,
// *.render.com). Cualquiera puede desplegar en esas plataformas y, con
// credentials: true, llamar a esta API desde un origen ajeno.
const DOMINIOS_PROPIOS = [
  'https://miguelcalzada.com',
  'https://www.miguelcalzada.com',
  'https://miguelcalzada.es',
  'https://www.miguelcalzada.es',
];

const DEFAULT_CORS_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:3003',
  ...DOMINIOS_PROPIOS,
].join(',');

const allowedOrigins = new Set(
  (process.env.CORS_ORIGINS || DEFAULT_CORS_ORIGINS)
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
);

app.use(cors({
  origin: (origin, callback) => {
    // Peticiones sin Origin (curl, Postman, server-to-server) siempre permitidas.
    if (!origin) return callback(null, true);
    if (allowedOrigins.has(origin)) return callback(null, true);
    callback(new Error(`CORS bloqueado para: ${origin}`));
  },
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

// gtfsService: tiempos reales GTFS-RT (independiente del modo mock/real)
const gtfsService = require('./services/gtfsService');

// generarHorarioEstacion siempre se carga desde mockDb (es un cálculo puro de horarios, no necesita BD)
const { generarHorarioEstacion: _generarHorarioEstacion } = require('./services/mockDb');

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
  generarHorarioEstacion = _generarHorarioEstacion; // siempre disponible
}

// Inyectar en el contexto de la app para que las rutas lo usen
app.locals.TransitAlert  = TransitAlert;
app.locals.VehicleStatus = VehicleStatus;

// Rutas REST
const buildRoutes = require('./routes/statusRoutes');
app.use('/api', buildRoutes(TransitAlert, VehicleStatus, generarHorarioEstacion, gtfsService));

// Inicializar servicio GTFS-RT (asíncrono, no bloquea el arranque)
gtfsService.inicializar().catch(err => logger.error(`[GTFS] Error en init: ${err.message}`));

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
  gtfsService.detener();
  detenerSocketServer();
  httpServer.close(() => { logger.info('✅ Apagado limpio'); process.exit(0); });
  setTimeout(() => process.exit(1), 8000);
};
process.on('SIGTERM', apagar);
process.on('SIGINT',  apagar);

module.exports = { app, httpServer };
