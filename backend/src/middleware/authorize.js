import { ApiError } from '../utils/ApiError.js';

/**
 * Role-based access control middleware.
 * Must be used AFTER `authenticate`.
 *
 * @param {...string} roles - Allowed roles, e.g. authorize('admin') or authorize('admin','moderator')
 *
 * @example
 * router.delete('/:id', authenticate, authorize('admin'), UserController.remove);
 */
export const authorize = (...roles) => (req, _res, next) => {
  if (!req.user) {
    return next(ApiError.unauthorized('Not authenticated'));
  }
  if (!roles.includes(req.user.role)) {
    return next(ApiError.forbidden(`Access denied. Required role: ${roles.join(' or ')}`));
  }
  next();
};
