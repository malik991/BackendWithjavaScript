import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
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
router.route("/get-video/:videoId").get(verifyJWT, getVideoById);
router.route("/watch-video/:videoId").get(watchVideo);
router.route("/publish-status/:videoId").patch(verifyJWT, togglePublishStatus);

export default router;
