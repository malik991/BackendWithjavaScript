import { Router } from "express";
import {
  registerUser,
  loginUser,
  checkUserProfile,
  logoutUser,
  getRefreshAccessToken,
  updatePassword,
  getCurrentUser,
  updateAccountDetails,
  updateAvatar,
  updateCoverImage,
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
router.route("/new-token").post(getRefreshAccessToken);
router.route("/change-password").post(upload.none(), verifyJWT, updatePassword);
router.route("/current-user").get(verifyJWT, getCurrentUser);
router
  .route("/update-account-details")
  .patch(upload.none(), verifyJWT, updateAccountDetails);
router
  .route("/update-avatar")
  .patch(verifyJWT, upload.single("avatar"), updateAvatar);
router
  .route("/update-cover-image")
  .patch(verifyJWT, upload.single("coverImage"), updateCoverImage);

// check protected route with session
router.route("/profile").get(Protect, checkUserProfile);

export default router;
