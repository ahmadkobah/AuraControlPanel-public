import winston from 'winston';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    const emoji = {
      error: '❌',
      warn: '⚠️',
      info: 'ℹ️',
      http: '🌐',
      debug: '🐛'
    }[level] || '📝';
    
    const msg = `${timestamp} ${emoji} [${level.toUpperCase()}] ${message}`;
    return stack ? `${msg}\n${stack}` : msg;
  })
);

// Create Winston logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    // Console output with colors
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        logFormat
      )
    }),
    // File output for all logs
    new winston.transports.File({
      filename: path.join(logsDir, 'control-panel.log'),
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      tailable: true
    }),
    // Separate file for errors
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      tailable: true
    })
  ]
});

// Add request logging helper
logger.logRequest = (req, statusCode, message) => {
  const logData = {
    method: req.method,
    url: req.originalUrl || req.url,
    status: statusCode,
    ip: req.ip || req.connection?.remoteAddress,
    admin: req.admin?.email || 'anonymous'
  };
  
  const logLevel = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
  logger[logLevel](`${logData.method} ${logData.url} - ${statusCode} - ${message || ''} - Admin: ${logData.admin}`);
};

// Capture uncaught exceptions
logger.exceptions.handle(
  new winston.transports.File({
    filename: path.join(logsDir, 'exceptions.log'),
    maxsize: 10 * 1024 * 1024,
    maxFiles: 3
  })
);

// Capture unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Promise Rejection:', { reason, promise });
});

export default logger;
