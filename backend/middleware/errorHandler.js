const { errorResponse } = require('../utils/apiResponse');

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let errors = [];

  // Mongoose Bad ObjectId (CastError)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid resource identifier format for '${err.path}'`;
    errors = [{ field: err.path, message: `Invalid ID: '${err.value}'` }];
  }

  // Mongoose Validation Error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    errors = Object.keys(err.errors).map(field => ({
      field,
      message: err.errors[field].message
    }));
  }

  // MongoDB Duplicate Key Error (E11000)
  if (err.code === 11000) {
    statusCode = 409;
    const duplicatedKeys = Object.keys(err.keyValue || {});
    const key = duplicatedKeys[0] || 'field';
    const val = err.keyValue ? err.keyValue[key] : '';
    message = `Duplicate value '${val}' entered for unique field '${key}'`;
    errors = [{ field: key, message: `Value '${val}' already exists` }];
  }

  // JWT Errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid authentication token';
  }
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Authentication token has expired';
  }

  if (process.env.NODE_ENV === 'development') {
    console.error(`[Error] ${req.method} ${req.url} -> ${message}`, err);
  }

  return errorResponse(res, message, statusCode, errors);
};

module.exports = errorHandler;

