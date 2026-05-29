/**
 * logger.js - Configuración centralizada de logging con Winston
 * Madrid Transit Pulse: Backend API
 *
 * Niveles: error > warn > info > http > debug
 * En producción solo se muestran: error, warn, info
 * En desarrollo se muestran todos los niveles
 */

const winston = require('winston');

// Formato personalizado con timestamp y colores para consola
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'HH:mm:ss.SSS' }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} [${level}]: ${message}${metaStr}`;
  })
);

// Formato JSON para archivos de log (parseables por ELK, Datadog, etc.)
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  transports: [
    // Consola: siempre activa durante desarrollo
    new winston.transports.Console({
      format: consoleFormat,
    }),
    // Archivo de errores: solo nivel error
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: fileFormat,
      maxsize: 5 * 1024 * 1024, // 5MB
      maxFiles: 3,
    }),
    // Archivo combinado: todos los niveles
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: fileFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    }),
  ],
  // Capturar excepciones no manejadas
  exceptionHandlers: [
    new winston.transports.File({ filename: 'logs/exceptions.log' }),
  ],
  exitOnError: false,
});

module.exports = logger;
