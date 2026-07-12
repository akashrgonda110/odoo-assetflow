import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

/**
 * General API rate limiter.
 * Apply globally or per-route as needed.
 */
export const apiLimiter = rateLimit({
  windowMs:         env.rateLimit.windowMs,
  max:              env.rateLimit.max,
  standardHeaders:  true,   // Return rate limit info in `RateLimit-*` headers
  legacyHeaders:    false,
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
  },
});

/**
 * Stricter limiter for auth endpoints (login / register).
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max:      20,
  standardHeaders: true,
  legacyHeaders:   false,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.',
  },
});
