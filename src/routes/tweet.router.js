import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

import {
  createTweet,
  updateTweet,
  deleteTweet,
  getUserTweets,
} from "../controllers/tweet.controller.js";

const router = Router();
router.use(verifyJWT);
router.route("/create-tweet").post(upload.none(), createTweet);
router.route("/update-tweet/:tweetId").patch(upload.none(), updateTweet);
router.route("/delete-tweet/:tweetId").delete(deleteTweet);
router.route("/get-user-tweets").get(getUserTweets);
export default router;
