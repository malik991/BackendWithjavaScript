import { Router } from "express";
import {
  registerUser,
  loginUser,
  logoutUser,
  getRefreshAccessToken,
  updatePassword,
  getCurrentUser,
  updateAccountDetails,
  updateAvatar,
  updateCoverImage,
  getChannelProfile,
  getWatchHistory,
  addToWatchHistory,
} from "../controllers/user.controller.js";

import {
  toggledSubscription,
  getSubscribedChannels,
  getUserChannelSubscribers,
  //unsubscribeFromChannel,
} from "../controllers/subUnsub.controller.js";

import {
  upload,
  checkFileTypeAndSize,
} from "../middlewares/multer.middleware.js";
import { Protect, verifyJWT } from "../middlewares/auth.middleware.js";
import { cleanupFilesOnError } from "../middlewares/cleanupFilesOnError.middleware.js";

const router = Router();

// Route for Google OAuth login
//router.get("/auth/google", );
// router.get(
//   "/auth/google",
//   passport.authenticate("google", { scope: ["profile", "email"] })
// );
// Callback route for Google OAuth login
// router.get("/auth/google/callback", (req, res, next) => {
//   console.log("successfull call back");
// Handle the Google OAuth callback
// This route should be defined in your Google Developer Console as the redirect URI
// After successful authentication, Google will redirect to this endpoint with the authentication data
// });

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
  (req, res, next) => {
    // Set avatarLocalfilePath and coverImgLocalPath in req for later use
    req.avatarLocalfilePath = req.files["avatar"]
      ? req.files["avatar"][0].path
      : null;
    req.coverImgLocalPath = req.files["coverImage"]
      ? req.files["coverImage"][0].path
      : null;
    next();
  },
  checkFileTypeAndSize,
  registerUser,
  cleanupFilesOnError
);

router.route("/login").post(upload.none(), loginUser);

/// ********** users controller routes ******************
router.route("/logout").get(verifyJWT, logoutUser);
router.route("/new-access-token").get(getRefreshAccessToken);
router.route("/change-password").post(verifyJWT, upload.none(), updatePassword);
router.route("/current-user").get(verifyJWT, getCurrentUser);
router
  .route("/update-account-details")
  .patch(verifyJWT, upload.none(), updateAccountDetails);
router.route("/update-avatar").patch(
  verifyJWT,
  upload.single("avatar"),
  (req, res, next) => {
    req.avatarLocalfilePath =
      req.file && req.file.fieldname === "avatar"
        ? req.file.path // Wrap the file path in an object to maintain consistency
        : null;
    req.coverImgLocalPath = null;
    next();
  },
  checkFileTypeAndSize,
  updateAvatar,
  cleanupFilesOnError
);
router.route("/update-cover-image").patch(
  verifyJWT,
  upload.single("coverImage"),
  (req, res, next) => {
    req.coverImgLocalPath =
      req.file && req.file.fieldname === "coverImage"
        ? req.file.path // Wrap the file path in an object to maintain consistency
        : null;
    req.avatarLocalfilePath = null;
    next();
  },
  checkFileTypeAndSize,
  updateCoverImage,
  cleanupFilesOnError
);
router.route("/c/:username").get(getChannelProfile);
router.route("/watch-history").get(verifyJWT, getWatchHistory);
router.route("/add-watch-history/:videoId").post(verifyJWT, addToWatchHistory);

// *********** routes for sub unsub channels
router
  .route("/toggled-subscription/:channelUserName")
  .post(verifyJWT, toggledSubscription);
router
  .route("/get-subscribers/:channelId")
  .get(verifyJWT, getUserChannelSubscribers);
router
  .route("/get-channel-list/:subscriberId")
  .get(verifyJWT, getSubscribedChannels);

export default router;
