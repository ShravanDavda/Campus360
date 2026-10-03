export const errorHandler = (err, req, res, next) => {
  console.error(err.message);

  if (err.statusCode && err.code) {
    const response = {
      success: false,
      error: {
        code: err.code,
        message: err.message,
      },
    };

    if (err.details) {
      response.error.details = err.details;
    }

    return res.status(err.statusCode).json(response);
  }

  return res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message:
        "An unexpected error occurred. Please try again later.",
    },
  });
};