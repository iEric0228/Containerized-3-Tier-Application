import winston from 'winston';
import LokiTransport from 'winston-loki';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    // Console transport for local development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
    // Loki transport for log aggregation
    new LokiTransport({
      host: process.env.LOKI_HOST || 'http://grafana-lgtm:3100',
      labels: { 
        job: 'backend',
        app: 'containerized-app'
      },
      json: true,
      format: winston.format.json(),
      replaceTimestamp: true,
      onConnectionError: (err) => console.error('Loki connection error:', err)
    })
  ],
});

export default logger;
