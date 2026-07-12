/**
 * Custom error class for operational HTTP errors.
 * Throw this anywhere in the app — the global error handler will
 * format it into a consistent JSON response.
 */
export class ApiError extends Error {
  /**
   * @param {number} statusCode - HTTP status code (e.g. 404, 400)
   * @param {string} message    - Human-readable error message
   * @param {any[]}  errors     - Optional field-level validation errors
   */
  constructor(statusCode, message, errors = []) {
    super(message);
    this.statusCode = statusCode;
    this.errors     = errors;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(msg, errors = []) {
    return new ApiError(400, msg, errors);
  }

  static unauthorized(msg = 'Unauthorized') {
    return new ApiError(401, msg);
  }

  static forbidden(msg = 'Forbidden') {
    return new ApiError(403, msg);
  }

  static notFound(msg = 'Resource not found') {
    return new ApiError(404, msg);
  }

  static internal(msg = 'Internal server error') {
    return new ApiError(500, msg);
  }
}
