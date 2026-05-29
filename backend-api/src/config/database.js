/**
 * database.js - Configuración y conexión a MongoDB mediante Mongoose
 * Madrid Transit Pulse: Backend API
 *
 * Gestiona el ciclo de vida completo de la conexión:
 * - Conexión inicial con retry automático
 * - Eventos de reconexión/desconexión
 * - Exposición del estado de conexión para health checks
 */

const mongoose = require('mongoose');
const logger = require('./logger');

// ============================================================
// Opciones de conexión de Mongoose
// ============================================================
const MONGOOSE_OPTIONS = {
  // Tiempo máximo de espera para establecer la conexión inicial
  serverSelectionTimeoutMS: 5000,
  // Tiempo máximo de espera para una operación (query, write, etc.)
  socketTimeoutMS: 45000,
  // Mantiene viva la conexión TCP
  family: 4, // IPv4 explícito para evitar problemas en Docker
};

// ============================================================
// Estado interno de la conexión
// ============================================================
let isConnected = false;

/**
 * Establece la conexión a MongoDB.
 * Si ya está conectado, retorna inmediatamente.
 *
 * @returns {Promise<void>}
 */
const connectDB = async () => {
  if (isConnected) {
    logger.debug('MongoDB: ya hay una conexión activa, reutilizando...');
    return;
  }

  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    throw new Error('❌ MONGO_URI no está definida en las variables de entorno');
  }

  logger.info(`🔌 Conectando a MongoDB...`);

  try {
    await mongoose.connect(mongoUri, MONGOOSE_OPTIONS);
    isConnected = true;
    logger.info('✅ MongoDB conectado correctamente');
  } catch (error) {
    logger.error(`❌ Error al conectar con MongoDB: ${error.message}`);
    // Reintento automático cada 5 segundos
    logger.info('⏳ Reintentando conexión en 5 segundos...');
    setTimeout(connectDB, 5000);
  }
};

// ============================================================
// Eventos del ciclo de vida de Mongoose
// ============================================================

mongoose.connection.on('connected', () => {
  isConnected = true;
  logger.info('📡 Mongoose: conexión establecida');
});

mongoose.connection.on('error', (error) => {
  isConnected = false;
  logger.error(`❌ Mongoose error: ${error.message}`);
});

mongoose.connection.on('disconnected', () => {
  isConnected = false;
  logger.warn('⚠️  Mongoose: conexión perdida. Reconectando...');
});

mongoose.connection.on('reconnected', () => {
  isConnected = true;
  logger.info('🔄 Mongoose: reconexión exitosa');
});

// Cierre limpio al recibir señal de terminación del proceso
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  logger.info('🔒 MongoDB: conexión cerrada por SIGINT');
  process.exit(0);
});

/**
 * Retorna el estado actual de la conexión a MongoDB.
 * @returns {{ connected: boolean, state: string }}
 */
const getConnectionStatus = () => ({
  connected: isConnected,
  state: mongoose.connection.readyState === 1 ? 'connected'
       : mongoose.connection.readyState === 2 ? 'connecting'
       : mongoose.connection.readyState === 3 ? 'disconnecting'
       : 'disconnected',
});

module.exports = { connectDB, getConnectionStatus };
