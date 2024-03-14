import { Router } from "express";
import {
  upload,
  checkFileTypeAndSize,
} from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { cleanupFilesOnError } from "../middlewares/cleanupFilesOnError.middleware.js";
import {
  createPlaylist,
  updatePlaylist,
  addVideoIntoPlaylist,
  checkUserPlaylists,
  deletePlaylist,
  deleteVideoFromPlaylist,
  getPlaylistById,
} from "../controllers/playlist.controller.js";

const router = Router();

router.route("/create-play-list").post(
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
  createPlaylist,
  cleanupFilesOnError
);
router.route("/update-playlist/:playlistId").post(
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
  updatePlaylist,
  cleanupFilesOnError
);
router
  .route("/add-video-into-playlist/:videoId/:playlistId")
  .post(verifyJWT, addVideoIntoPlaylist);
router.route("/check-user-playlist").get(verifyJWT, checkUserPlaylists);
router.route("/delete-playlist/:playlistId").delete(verifyJWT, deletePlaylist);
router
  .route("/deleted-from-playlist/:videoId/:playlistId")
  .delete(verifyJWT, deleteVideoFromPlaylist);
router.route("/get-playlist/:playlistId").get(verifyJWT, getPlaylistById);

export default router;
