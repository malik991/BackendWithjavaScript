import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import {
  toggleCommentLike,
  toggleVideoLike,
  getLikedVideos,
} from "../controllers/like.controller.js";

const router = Router();

router.route("/get-liked-videos").get(verifyJWT, getLikedVideos);

export default router;
