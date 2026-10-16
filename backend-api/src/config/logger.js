/**
 * logger.js - Configuración centralizada de logging con Winston
 * Madrid Transit Pulse: Backend API
 *
 * Niveles: error > warn > info > http > debug
 * En producción solo se muestran: error, warn, info
 * En desarrollo se muestran todos los niveles
 */

const winston = require('winston');

const isProd = process.env.NODE_ENV === 'production' || !!process.env.RAILWAY_ENVIRONMENT;
const logToFile = !isProd || process.env.LOG_TO_FILE === 'true';

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

// Consola: siempre activa (Railway recoge stdout).
const transports = [
  new winston.transports.Console({ format: consoleFormat }),
];

// En produccion el disco es efimero y escribir logs consume I/O; solo se
// activan los transports de fichero en local o si LOG_TO_FILE=true.
if (logToFile) {
  transports.push(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: fileFormat,
      maxsize: 5 * 1024 * 1024, // 5MB
      maxFiles: 3,
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: fileFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    })
  );
}

const logger = winston.createLogger({
  // En produccion solo error/warn salvo que se indique otro nivel.
  // En desarrollo se muestran todos los niveles.
  level: process.env.LOG_LEVEL || (isProd ? 'warn' : 'info'),
  transports,
  // Capturar excepciones no manejadas
  exceptionHandlers: logToFile
    ? [new winston.transports.File({ filename: 'logs/exceptions.log' })]
    : [],
  exitOnError: false,
});

module.exports = logger;
