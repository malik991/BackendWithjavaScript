import { ApiErrorHandler } from "../utils/ApiErrorHandler.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponce } from "../utils/ApiResponse.js";

const healthCheck = asyncHandler(async (req, res) => {
  return res.status(200).json(new ApiResponce(200, null, "OK"));
});

export { healthCheck };
