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
    // err.constraint is the DB constraint name, e.g. "assets_serial_number_key"
    // err.detail is like: Key (serial_number)=(SN-001) already exists.
    const fieldMatch = err.detail?.match(/Key \((.+?)\)/);
    const field = fieldMatch ? fieldMatch[1] : null;
    const fieldLabel = field === 'serial_number' ? 'Serial number'
                     : field === 'email'         ? 'Email address'
                     : field === 'name'           ? 'Name'
                     : field                      ? field.replace(/_/g, ' ')
                     : null;
    const message = fieldLabel
      ? `${fieldLabel} already exists. Please use a different value.`
      : 'A record with that value already exists.';
    return ApiResponse.error(res, 409, message);
  }

  // PostgreSQL foreign-key violation
  if (err.code === '23503') {
    return ApiResponse.error(res, 400, 'Related resource does not exist.');
  }

  // Fallback — never leak internals to the client in production
  const message = env.isDev ? err.message : 'Internal server error';
  return ApiResponse.error(res, 500, message);
};
