import { ApiErrorHandler } from "../utils/ApiErrorHandler.js";
import { ApiResponce } from "../utils/ApiResponse.js";
// check the user authenticity either loggin or not
const Protect = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    // return res
    //   .status(401)
    //   .json(new ApiResponce(401, null, "Unauthoried, please login"));
    throw new ApiErrorHandler(401, "Unauthorized, please login");
  }
  next();
};

export { Protect };
