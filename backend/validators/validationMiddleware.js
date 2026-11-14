const { validationResult } = require('express-validator');
const { errorResponse } = require('../utils/apiResponse');

const validate = (validations) => {
  return async (req, res, next) => {
    // Run all validations
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    const extractedErrors = errors.array().map(err => ({
      field: err.path || err.param,
      message: err.msg,
      value: err.value
    }));

    return errorResponse(res, 'Validation failed', 400, extractedErrors);
  };
};

module.exports = {
  validate
};

