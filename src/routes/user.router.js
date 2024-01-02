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
  uploadVideo,
  updateTitleAndDescription,
  updateThumbNail,
  getAllVideos,
  userSpecificVideos,
  deleteVideo,
} from "../controllers/video.controller.js";
import {
  channelSubscription,
  unsubscribeFromChannel,
} from "../controllers/subUnsub.controller.js";
import {
  createPlaylist,
  updatePlaylist,
} from "../controllers/playlist.controller.js";
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
router.route("/get-all-videos").get(getAllVideos);
// *********** secured routes with token ************ .---------------
// video controller routes
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
router
  .route("/update-thumbnail/:videoId")
  .patch(verifyJWT, upload.single("thumbNail"), updateThumbNail);
router.route("/user-specific-videos").get(verifyJWT, userSpecificVideos);
router.route("/delete-video/:videoId").delete(verifyJWT, deleteVideo);
/// ********** users controller routes ******************
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
router.route("/c/:username").get(verifyJWT, getChannelProfile);
router.route("/watch-history").get(verifyJWT, getWatchHistory);
router.route("/add-watch-history/:videoId").post(verifyJWT, addToWatchHistory);

// *********** routes for sub unsub channels
router
  .route("/channel-subscription/:channelUserName")
  .post(verifyJWT, channelSubscription);
router
  .route("/unsubscribed/:channelUserName")
  .delete(verifyJWT, unsubscribeFromChannel);

// ******* Play list routes *********
router
  .route("/create-play-list")
  .post(verifyJWT, upload.none(), createPlaylist);
router
  .route("/update-playlist/:playlistId")
  .post(verifyJWT, upload.none(), updatePlaylist);
// check protected route with session
//router.route("/profile").get(Protect, checkUserProfile);

export default router;
