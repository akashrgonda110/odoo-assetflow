import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Verifies the short-lived access token from the Authorization header.
 * Attaches the decoded payload to `req.user`.
 */
export const authenticate = (req, _res, next) => {
  const header = req.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    return next(ApiError.unauthorized('No access token provided'));
  }

  const token = header.split(' ')[1];

  try {
    req.user = jwt.verify(token, env.jwt.accessSecret);
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(ApiError.unauthorized('Access token expired'));
    }
    next(ApiError.unauthorized('Invalid access token'));
  }
};
