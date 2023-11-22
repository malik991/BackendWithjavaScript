class ApiResponce {
  constructor(statusCode, data, messgae = "Success") {
    // fill all data with your parameters
    this.statusCode = statusCode;
    this.data = data;
    this.messgae = messgae;
    this.success = statusCode < 400;
  }
}

export { ApiResponce };
