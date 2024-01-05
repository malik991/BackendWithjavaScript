import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  createPlaylist,
  updatePlaylist,
  addVideoIntoPlaylist,
  checkUserPlaylists,
  deletePlaylist,
  deleteVideoFromPlaylist,
} from "../controllers/playlist.controller.js";

const router = Router();

router
  .route("/create-play-list")
  .post(verifyJWT, upload.none(), createPlaylist);
router
  .route("/update-playlist/:playlistId")
  .post(verifyJWT, upload.none(), updatePlaylist);
router
  .route("/add-video-into-playlist/:videoId/:playlistId")
  .post(verifyJWT, addVideoIntoPlaylist);
router.route("/check-user-playlist").get(verifyJWT, checkUserPlaylists);
router.route("/delete-playlist/:playlistId").delete(verifyJWT, deletePlaylist);
router
  .route("/deleted-from-playlist/:videoId/:playlistId")
  .delete(verifyJWT, deleteVideoFromPlaylist);

export default router;
