import { validationResult } from 'express-validator';
import { ApiError } from '../utils/ApiError.js';

/**
 * Run after express-validator chains.
 * Collects all validation errors and throws a 400 if any exist.
 */
export const validate = (req, _res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formatted = errors.array().map((e) => ({
      field:   e.path,
      message: e.msg,
    }));
    return next(ApiError.badRequest('Validation failed', formatted));
  }
  next();
};
