import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

/**
 * General API rate limiter.
 * Apply globally or per-route as needed.
 */
export const apiLimiter = rateLimit({
  windowMs:         env.rateLimit.windowMs,
  max:              env.rateLimit.max,
  standardHeaders:  true,
  legacyHeaders:    false,
  skip:             () => env.isDev,   // disabled in development
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
  },
});

/**
 * Stricter limiter for auth endpoints (login / register).
 * Disabled in development so local testing is never blocked.
 */
export const authLimiter = rateLimit({
  windowMs:        15 * 60 * 1000, // 15 minutes
  max:             20,
  standardHeaders: true,
  legacyHeaders:   false,
  skip:            () => env.isDev,   // disabled in development
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.',
  },
});
