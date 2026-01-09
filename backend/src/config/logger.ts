import winston from 'winston';
import LokiTransport from 'winston-loki';

// Build transports array conditionally
const transports: winston.transport[] = [
  // Console transport - always enabled
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
  })
];

// Only add Loki transport if LOKI_HOST is explicitly set
// This prevents connection errors in environments without Loki (like ECS)
if (process.env.LOKI_HOST) {
  transports.push(
    new LokiTransport({
      host: process.env.LOKI_HOST,
      labels: { 
        job: 'backend',
        app: 'containerized-app'
      },
      json: true,
      format: winston.format.json(),
      replaceTimestamp: true,
      onConnectionError: (err) => console.error('Loki connection error:', err)
    })
  );
}

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports,
});

export default logger;
