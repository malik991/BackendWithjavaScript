import { Router } from "express";
import {
  registerUser,
  loginUser,
  checkUserProfile,
  logoutUser,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { Protect, verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// here we will define get , post related to user
router.route("/register").post(
  // add our middleware here "multer" for uploading file
  upload.fields([
    {
      name: "avatar", // should be same name as written in frontEnd filed
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),
  registerUser
);

router.route("/login").post(upload.none(), loginUser);

// secured routes with token
router.route("/logout").get(verifyJWT, logoutUser);
// check protected route with session
router.route("/profile").get(Protect, checkUserProfile);

export default router;
