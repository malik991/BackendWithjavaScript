import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  toggleCommentLike,
  toggleVideoLike,
  getLikedVideos,
  toggleTweetLike,
  getLikedByVideoId,
  getTotalLikesByCommentId,
} from "../controllers/like.controller.js";

const router = Router();
router.route("/liked-videos-by-videoId/v/:videoId").get(getLikedByVideoId);
router
  .route("/liked-comments-by-commentId/:contentId")
  .get(getTotalLikesByCommentId);
router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

router.route("/toggle/v/:videoId").post(toggleVideoLike);
router.route("/toggle/c/:commentId").post(toggleCommentLike);
router.route("/toggle/t/:tweetId").post(toggleTweetLike);
router.route("/liked-videos").get(getLikedVideos);

export default router;
