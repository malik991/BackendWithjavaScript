class ApiResponce {
  constructor(statusCode, data, message = "Success") {
    // fill all data with your parameters
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    this.success = statusCode < 400;
  }
}

export { ApiResponce };
