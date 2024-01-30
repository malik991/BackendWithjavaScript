import "dotenv/config";
import { ApiErrorHandler } from "../utils/ApiErrorHandler.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
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

// checked the user through jwt token to verify the user
const verifyJWT = asyncHandler(async (req, _, next) => {
  //get token from cookies or from custome headre of mobile
  try {
    //console.log("req cookie", req.cookies);
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer", "");

    if (!token) {
      throw new ApiErrorHandler(401, "Acess token Authorization failed");
    }

    // get the verification from jwt and pass secret key for decoded info
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    // use decoded info and hit the DB query
    const user = await User.findById(decodedToken?._id).select(
      "-password -refreshToken"
    );

    // now add a new obj in req
    req.user = user;
    next();
  } catch (error) {
    throw new ApiErrorHandler(401, error?.message || "Invalid Access Token");
  }
});

export { Protect, verifyJWT };
