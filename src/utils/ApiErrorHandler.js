class ApiErrorHandler extends Error {
  // create our parametrized constructor
  constructor(
    statusCode,
    message = "some thing went wrong",
    errors = [],
    stack = ""
  ) {
    // here we call super constructor and over ride all items
    // and define all your required data argument
    super(message);
    this.statusCode = statusCode;
    this.message = message;
    this.data = null; // read about it in nodejs why it should be null
    this.success = false;
    this.errors = errors;
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
  // Method to send JSON response
  sendJsonResponse(res) {
    res.status(this.statusCode).json({
      success: this.success,
      message: this.message,
      errors: this.errors,
    });
  }
}

export { ApiErrorHandler };
