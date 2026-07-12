/**
 * Standardised JSON response shape.
 *
 * Success:  { success: true,  data, message }
 * Error:    { success: false, message, errors }
 */
export class ApiResponse {
  /**
   * Send a success response.
   *
   * @param {import('express').Response} res
   * @param {number} statusCode
   * @param {any}    data
   * @param {string} message
   */
  static success(res, statusCode = 200, data = null, message = 'Success') {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
    });
  }

  /**
   * Send an error response.
   *
   * @param {import('express').Response} res
   * @param {number}   statusCode
   * @param {string}   message
   * @param {any[]}    errors
   */
  static error(res, statusCode = 500, message = 'Something went wrong', errors = []) {
    return res.status(statusCode).json({
      success: false,
      message,
      ...(errors.length && { errors }),
    });
  }
}
