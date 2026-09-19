const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || err.status || (res.statusCode === 200 ? 500 : res.statusCode);
  let message = err.message;

  // An upload the user can fix (too big, too many) - not a server fault
  if (err.name === "MulterError") {
    statusCode = 400;
    if (err.code === "LIMIT_FILE_SIZE") message = "Each photo must be 5 MB or smaller";
    if (err.code === "LIMIT_UNEXPECTED_FILE") message = "You can upload up to 5 photos";
    if (err.code === "LIMIT_FILE_COUNT") message = "You can upload up to 5 photos";
  }

  // A request body that isn't valid JSON, or is too big - the parser's own
  // wording quotes the offending text, so it isn't passed on.
  if (err.type === "entity.parse.failed") {
    statusCode = 400;
    message = "The request couldn't be read. Please try again.";
  }
  if (err.type === "entity.too.large") {
    statusCode = 413;
    message = "That request is too large.";
  }

  // Mongoose bad ObjectId
  if (err.name === "CastError" && err.kind === "ObjectId") {
    statusCode = 404;
    message = "Resource not found";
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue || {})[0] || "Field";
    message = `${field.charAt(0).toUpperCase() + field.slice(1)} is already in use`;
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((val) => val.message)
      .join(", ");
  }

  // Anything else that goes wrong on our side is written to the server log,
  // where it can be fixed - and the person only gets a plain apology, never
  // the internals (error text, file paths, a stack trace).
  if (statusCode >= 500) {
    console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} -> ${statusCode}\n${err.stack || err}`);
    message = "Something went wrong on our side. Please try again.";
  }

  res.status(statusCode).json({ message, ...(err.sessionEnded ? { sessionEnded: true } : {}) });
};

module.exports = { notFound, errorHandler };
