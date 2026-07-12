import { createLogger, format, transports } from 'winston';
import { env } from '../config/env.js';

const { combine, timestamp, printf, colorize, errors } = format;

const devFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp, stack }) =>
    stack
      ? `${timestamp} [${level}] ${message}\n${stack}`
      : `${timestamp} [${level}] ${message}`
  )
);

const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  format.json()
);

export const logger = createLogger({
  level: env.isDev ? 'debug' : 'info',
  format: env.isDev ? devFormat : prodFormat,
  transports: [
    new transports.Console(),
    // Rotate logs in production — add winston-daily-rotate-file here if needed
    ...(env.isDev
      ? []
      : [
          new transports.File({ filename: 'logs/error.log', level: 'error' }),
          new transports.File({ filename: 'logs/combined.log' }),
        ]),
  ],
});
