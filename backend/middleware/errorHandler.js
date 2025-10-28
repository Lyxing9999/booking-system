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

  // Unexpected error
  console.error(err);
  res.status(500).json({
    status: "error",
    code: "INTERNAL_ERROR",
    message: "Something went wrong on the server!",
    hint: "Please try again later.",
  });
}
