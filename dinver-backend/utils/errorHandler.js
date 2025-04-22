const handleError = (res, error) => {
  console.error('Error:', error);

  if (error.name === 'SequelizeValidationError') {
    return res.status(400).json({
      error: 'Validation error',
      details: error.errors.map((err) => err.message),
    });
  }

  if (error.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({
      error: 'Duplicate entry',
      details: error.errors.map((err) => err.message),
    });
  }

  if (error.name === 'SequelizeForeignKeyConstraintError') {
    return res.status(400).json({
      error: 'Invalid reference',
      details: 'The referenced record does not exist',
    });
  }

  res.status(500).json({
    error: 'Internal server error',
    message: error.message,
  });
};

module.exports = { handleError };
