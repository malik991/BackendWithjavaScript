import { Router } from "express";
import {
  upload,
  checkFileTypeAndSize,
} from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  uploadVideo,
  updateTitleAndDescription,
  updateThumbNail,
  getAllVideos,
  userSpecificVideos,
  deleteVideo,
  getVideoById,
  togglePublishStatus,
  watchVideo,
  getVideosByAnyUserId,
} from "../controllers/video.controller.js";
import { cleanupFilesOnError } from "../middlewares/cleanupFilesOnError.middleware.js";

const router = Router();

router.route("/get-all-videos").get(getAllVideos);
router.route("/get-channel-videos/:userId").get(getVideosByAnyUserId);
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
  (req, res, next) => {
    // Set avatarLocalfilePath and coverImgLocalPath in req for later use
    req.avatarLocalfilePath = req.files["thumbNail"]
      ? req.files["thumbNail"][0].path
      : null;
    req.coverImgLocalPath = req.files["videoFile"]
      ? req.files["videoFile"][0].path
      : null;
    next();
  },
  checkFileTypeAndSize,
  uploadVideo,
  cleanupFilesOnError
);
router
  .route("/update-title-description/:videoId")
  .patch(verifyJWT, upload.none(), updateTitleAndDescription);
router.route("/update-thumbnail/:videoId").patch(
  verifyJWT,
  upload.single("thumbNail"),
  (req, res, next) => {
    req.avatarLocalfilePath =
      req.file && req.file.fieldname === "thumbNail"
        ? req.file.path // Wrap the file path in an object to maintain consistency
        : null;
    req.coverImgLocalPath = null;
    next();
  },
  checkFileTypeAndSize,
  updateThumbNail,
  cleanupFilesOnError
);
router.route("/user-specific-videos").get(verifyJWT, userSpecificVideos);
router.route("/delete-video/:videoId").delete(verifyJWT, deleteVideo);
router.route("/get-video/:videoId").get(verifyJWT, getVideoById);
router.route("/watch-video/:videoId").get(watchVideo);
router.route("/publish-status/:videoId").patch(verifyJWT, togglePublishStatus);

export default router;
