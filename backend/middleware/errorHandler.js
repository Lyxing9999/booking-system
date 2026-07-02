import AppError from "../utils/errors.js";

export default function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: "error",
      code: err.code,
      message: err.message,
      hint: err.hint,
    });
  }

  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      status: "error",
      code: "FILE_TOO_LARGE",
      message: "Image must be smaller than 5MB",
    });
  }

  if (err.message === "Only image files are allowed") {
    return res.status(400).json({
      status: "error",
      code: "INVALID_FILE_TYPE",
      message: err.message,
    });
  }

  // Unexpected error
  console.error(err);
  res.status(500).json({
    status: "error",
    code: "INTERNAL_ERROR",
    message: "Something went wrong on the server!",
    hint: "Please try again later.",
  });
}
