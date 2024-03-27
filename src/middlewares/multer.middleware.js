import multer from "multer";
import { ApiErrorHandler } from "../utils/ApiErrorHandler.js";

// disk storage
const storage = multer.diskStorage({
  // req come from user req, file provide by the multer in user req, cb callback
  destination: function (req, file, cb) {
    cb(null, "./public/temp");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.originalname + "-" + uniqueSuffix);
  },
});

// Define the limits for file size
const limits = {
  fileSize: {
    // Limit for image files (in bytes)
    //image: 2 * 1024 * 1024, // 2 MB,
    avatar: 200 * 1024, // 50kb
    coverImage: 200 * 1024,
    thumbNail: 200 * 1024,
    // Limit for video files (in bytes)
    video: 1 * 1024 * 1024, // 1 MB
    //video: 20 * 1024 * 1024, // 20 MB
  },
};

export const upload = multer({ storage: storage, limits: limits.fileSize }); // storage is our method

// Middleware to check the file type and size
export const checkFileTypeAndSize = (req, res, next) => {
  try {
    const avatarFile =
      req.files && req.files["avatar"]
        ? req.files["avatar"][0]
        : req.file && req.file.fieldname === "avatar"
          ? req.file
          : null;
    const coverImageFile =
      req.files && req.files["coverImage"]
        ? req.files["coverImage"][0]
        : req.file && req.file.fieldname === "coverImage"
          ? req.file // Wrap the file path in an object to maintain consistency
          : null;

    const thumbNailFile =
      req.files && req.files["thumbNail"]
        ? req.files["thumbNail"][0]
        : req.file && req.file.fieldname === "thumbNail"
          ? req.file // Wrap the file path in an object to maintain consistency
          : null;
    const uploadVideoFile =
      req.files && req.files["videoFile"] ? req.files["videoFile"][0] : null;
    //console.log("ava: ", avatarFile, " cover: ", coverImageFile);
    if (avatarFile) {
      if (!isAllowedFileType(avatarFile.mimetype, allowedAvatarTypes)) {
        throw new ApiErrorHandler(
          400,
          "Invalid avatar file type, allowed jpeg/png."
        );
      }
      if (avatarFile.size > limits.fileSize.avatar) {
        throw new ApiErrorHandler(
          400,
          "Avatar file size exceeds the limit (199KB)"
        );
      }
    }
    if (coverImageFile) {
      if (!isAllowedFileType(coverImageFile.mimetype, allowedCoverImageTypes)) {
        throw new ApiErrorHandler(
          400,
          "Invalid CoverImage file type, allowed jpeg/png."
        );
      }
      if (coverImageFile.size > limits.fileSize.coverImage) {
        throw new ApiErrorHandler(
          400,
          "CoverImage file size exceeds the limit (199KB)"
        );
      }
    }
    if (thumbNailFile) {
      if (!isAllowedFileType(thumbNailFile.mimetype, allowedThumbNailTypes)) {
        throw new ApiErrorHandler(
          400,
          "Invalid Thumbnail file type, allowed jpeg/png."
        );
      }
      if (thumbNailFile.size > limits.fileSize.thumbNail) {
        throw new ApiErrorHandler(
          400,
          "ThumbNail file size exceeds the limit (199kB)"
        );
      }
    }
    if (uploadVideoFile) {
      if (!isAllowedFileType(uploadVideoFile.mimetype, allowedVideoFileTypes)) {
        throw new ApiErrorHandler(
          400,
          "Invalid Video file type, allowed just mp4."
        );
      }
      if (uploadVideoFile.size > limits.fileSize.video) {
        throw new ApiErrorHandler(
          400,
          "video file size exceeds the limit (1MB)"
        );
      }
    }
    // If everything is fine, move to the next middleware
    next();
  } catch (error) {
    console.log("error in checkFileTypeAndSize middleware: ", error);
    next(new ApiErrorHandler(400, error?.message));
  }
};

// Function to check if the file type is allowed
const isAllowedFileType = (mimetype, allowedTypes) => {
  return allowedTypes.includes(mimetype);
};

// Define the allowed MIME types for each file type
const allowedAvatarTypes = ["image/jpeg", "image/png"];
const allowedCoverImageTypes = ["image/jpeg", "image/png"];
const allowedThumbNailTypes = ["image/jpeg", "image/png"];
const allowedVideoFileTypes = ["video/mp4"];
