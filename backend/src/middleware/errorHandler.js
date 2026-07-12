import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

/**
 * Global Express error handler.
 * Must be registered LAST, after all routes.
 */
// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  // Log all errors
  logger.error(err.message, {
    stack:  env.isDev ? err.stack : undefined,
    path:   req.path,
    method: req.method,
  });

  // Known operational errors (thrown via ApiError)
  if (err instanceof ApiError && err.isOperational) {
    return ApiResponse.error(res, err.statusCode, err.message, err.errors);
  }

  // PostgreSQL unique-constraint violation
  if (err.code === '23505') {
    return ApiResponse.error(res, 409, 'A record with that value already exists.');
  }

  // PostgreSQL foreign-key violation
  if (err.code === '23503') {
    return ApiResponse.error(res, 400, 'Related resource does not exist.');
  }

  // Fallback — never leak internals to the client in production
  const message = env.isDev ? err.message : 'Internal server error';
  return ApiResponse.error(res, 500, message);
};
