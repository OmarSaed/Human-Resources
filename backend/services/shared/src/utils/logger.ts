import winston from 'winston';
import { LogEntry } from '../types';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Tell winston that you want to link the colors 
winston.addColors(colors);

// Chose the aspect of your log customizing the log format.
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`,
  ),
);

// Define which transports the logger must use to print out messages.
const transports = [
  new winston.transports.Console(),
  new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
  }),
  new winston.transports.File({ filename: 'logs/all.log' }),
];

// Create the logger instance that has to be exported 
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  format,
  transports,
  exitOnError: false,
});

// Enhanced logger with structured logging
export class StructuredLogger {
  private baseLogger: winston.Logger;
  private serviceName: string;
  private version: string;

  constructor(serviceName: string, version: string = '1.0.0') {
    this.serviceName = serviceName;
    this.version = version;
    this.baseLogger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
        winston.format.printf((info) => {
          return JSON.stringify({
            timestamp: info.timestamp,
            level: info.level,
            service: this.serviceName,
            version: this.version,
            message: info.message,
            ...(info.meta || {}),
            ...((info as any).stack && { stack: (info as any).stack }),
          });
        }),
      ),
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple(),
          ),
        }),
        new winston.transports.File({
          filename: `logs/${serviceName}-error.log`,
          level: 'error',
        }),
        new winston.transports.File({
          filename: `logs/${serviceName}.log`,
        }),
      ],
    });
  }

  info(message: string, meta?: Record<string, any>): void {
    this.baseLogger.info(message, { meta });
  }

  error(message: string, error?: Error | Record<string, any>): void {
    if (error instanceof Error) {
      this.baseLogger.error(message, { 
        meta: { 
          error: error.message,
          stack: error.stack 
        } 
      });
    } else {
      this.baseLogger.error(message, { meta: error });
    }
  }

  warn(message: string, meta?: Record<string, any>): void {
    this.baseLogger.warn(message, { meta });
  }

  debug(message: string, meta?: Record<string, any>): void {
    this.baseLogger.debug(message, { meta });
  }

  // Log business events for audit trails
  auditLog(entry: Omit<LogEntry, 'timestamp' | 'service'>): void {
    const auditEntry: LogEntry = {
      ...entry,
      timestamp: new Date(),
      service: this.serviceName,
    };

    this.baseLogger.info('Audit Log', { 
      meta: { 
        type: 'audit',
        ...auditEntry 
      } 
    });
  }

  // Performance logging
  performance(operation: string, duration: number, meta?: Record<string, any>): void {
    this.baseLogger.info(`Performance: ${operation}`, {
      meta: {
        type: 'performance',
        operation,
        duration,
        ...meta,
      },
    });
  }

  // HTTP request logging
  httpRequest(method: string, url: string, statusCode: number, duration: number, meta?: Record<string, any>): void {
    this.baseLogger.info(`HTTP ${method} ${url} - ${statusCode}`, {
      meta: {
        type: 'http',
        method,
        url,
        statusCode,
        duration,
        ...meta,
      },
    });
  }
}

// Export default logger instance
export { logger };

// Factory function to create service-specific loggers
export const createLogger = (serviceName: string, version?: string): StructuredLogger => {
  return new StructuredLogger(serviceName, version);
};
