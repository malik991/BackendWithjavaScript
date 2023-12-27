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
  getChannelProfile,
  getWatchHistory,
} from "../controllers/user.controller.js";
import {
  uploadVideo,
  updateTitleAndDescription,
} from "../controllers/video.controller.js";
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
router.route("/upload-video").post(
  verifyJWT,
  upload.fields([
    {
      name: "videoFile",
      maxCount: 1,
    },
    {
      name: "thumbNail",
      maxCount: 1,
    },
  ]),
  uploadVideo
);
router
  .route("/update-title-description/:videoId")
  .patch(verifyJWT, upload.none(), updateTitleAndDescription);
router.route("/logout").get(verifyJWT, logoutUser);
router.route("/new-token").post(getRefreshAccessToken);
router.route("/change-password").post(verifyJWT, upload.none(), updatePassword);
router.route("/current-user").get(verifyJWT, getCurrentUser);
router
  .route("/update-account-details")
  .patch(verifyJWT, upload.none(), updateAccountDetails);
router
  .route("/update-avatar")
  .patch(verifyJWT, upload.single("avatar"), updateAvatar);
router
  .route("/update-cover-image")
  .patch(verifyJWT, upload.single("coverImage"), updateCoverImage);
router.route("/c/:channelOrUserName").get(verifyJWT, getChannelProfile);
router.route("/watch-history").get(verifyJWT, getWatchHistory);

// check protected route with session
router.route("/profile").get(Protect, checkUserProfile);

export default router;
