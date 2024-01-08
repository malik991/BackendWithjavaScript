import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

import {
  addComment,
  editComment,
  deleteComment,
  getAllComments,
} from "../controllers/comment.controller.js";

const router = Router();

router.route("/get-comments/:videoId").get(getAllComments);

router
  .route("/add-comment/:videoId")
  .post(verifyJWT, upload.none(), addComment);

router
  .route("/edit-comment/:contentId")
  .put(verifyJWT, upload.none(), editComment);

router.route("/delete-comment/:contentId").delete(verifyJWT, deleteComment);

export default router;
