import winston from 'winston';

const { combine, timestamp, printf, colorize, json } = winston.format;

// Console format for development
const consoleFormat = combine(
  colorize(),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  printf(({ level, message, timestamp, requestId, ...meta }) => {
    const reqId = requestId ? ` [${requestId}]` : '';
    const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} ${level}${reqId}: ${message}${metaStr}`;
  })
);

// JSON format for production
const jsonFormat = combine(
  timestamp(),
  json()
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4
  },
  transports: [
    // Console transport (always active)
    new winston.transports.Console({
      format: process.env.NODE_ENV === 'production' ? jsonFormat : consoleFormat
    }),
    
    // Error log file
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: jsonFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    
    // Combined log file
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: jsonFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 10
    })
  ],
  // Do not exit on uncaught exception — handled by error middleware
  exitOnError: false
});

// Stream for Morgan HTTP request logging
logger.stream = {
  write: (message) => logger.http(message.trim())
};

// Sanitize logs — NEVER log sensitive data
logger.sanitize = (data) => {
  if (!data) return data;
  const sanitized = { ...data };
  const sensitiveFields = ['password', 'passwordHash', 'token', 'secret', 'apiKey', 'authorization', 'cookie'];
  sensitiveFields.forEach(field => {
    if (sanitized[field]) sanitized[field] = '[REDACTED]';
  });
  return sanitized;
};

export { logger };
