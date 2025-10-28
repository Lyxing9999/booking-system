
class AppError extends Error {
  constructor(message, statusCode = 500, code = "INTERNAL_ERROR", hint = "") {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    this.hint = hint;
    Error.captureStackTrace(this, this.constructor);
  }
}

export default AppError;
