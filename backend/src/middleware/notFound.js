import { ApiError } from '../utils/ApiError.js';

/**
 * Catch-all for routes that don't exist.
 * Place this AFTER all routes, BEFORE errorHandler.
 */
export const notFound = (req, _res, next) => {
  next(ApiError.notFound(`Route ${req.originalUrl} not found`));
};
