class AppError extends Error {
  errorCode;
  statusCode;

  constructor(errorCode, message, statusCode) {
    super(message);
    this.errorCode = errorCode;
    this.statusCode = statusCode;
  }
}

module.exports = AppError;
