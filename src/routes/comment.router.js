import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

import {
  addComment,
  editComment,
  deleteComment,
  //getAllComments,
  addReply,
  mainCommentAndParentReplies,
  nestedRepliesOfPrentReply,
} from "../controllers/comment.controller.js";

const router = Router();

//router.route("/get-comments/:videoId").get(getAllComments);

router.route("/main-parent-comments/:videoId").get(mainCommentAndParentReplies);
router.route("/nested-comments/:parentReplyId").get(nestedRepliesOfPrentReply);

router
  .route("/add-comment/:videoId")
  .post(verifyJWT, upload.none(), addComment);

router
  .route("/reply-comment/:parentCommentId")
  .post(verifyJWT, upload.none(), addReply);

router
  .route("/edit-comment/:contentId")
  .put(verifyJWT, upload.none(), editComment);

router.route("/delete-comment/:contentId").delete(verifyJWT, deleteComment);

export default router;
