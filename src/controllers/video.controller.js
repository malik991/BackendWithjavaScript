import mongoose from "mongoose";
import { Video } from "../models/video.model.js";
import { Playlist } from "../models/playlist.model.js";
import { Like } from "../models/like.model.js";
import { Comment } from "../models/comment.model.js";
import { ApiErrorHandler } from "../utils/ApiErrorHandler.js";
import { ApiResponce } from "../utils/ApiResponse.js";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinary.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import fs from "fs";

const uploadVideo = asyncHandler(async (req, res) => {
  // get the path of video and thumbnail from a form
  // check path empty or not
  // upload video and thumbnail on cloudinary
  // get the both url from cloudinary
  // store these URLs into DB
  // remove both files from local server
  // return responce to the user
  let localVideoPath;
  let localThumbnailPath;

  try {
    const { title, description } = req.body;

    if (
      req.files &&
      Array.isArray(req.files.videoFile) &&
      req.files.videoFile.length > 0
    ) {
      localVideoPath = req.files?.videoFile[0].path;
    }
    if (
      req.files &&
      Array.isArray(req.files.thumbNail) &&
      req.files.thumbNail.length > 0
    ) {
      localThumbnailPath = req.files?.thumbNail[0].path;
    }
    if (!title || !description) {
      throw new ApiErrorHandler(400, "title and descriptions are required");
    }
    if (!localThumbnailPath || !localVideoPath) {
      throw new ApiErrorHandler(
        404,
        "thumbnail and video are mendatory to upload!"
      );
    }
    const cloudinaryVideoUrl = await uploadOnCloudinary(localVideoPath);
    const cloudinaryThumbnailUrl = await uploadOnCloudinary(localThumbnailPath);
    if (!cloudinaryVideoUrl) {
      throw new ApiErrorHandler(
        500,
        "Error while uploading the video on cloudinary, please try again"
      );
    }
    if (!cloudinaryThumbnailUrl) {
      throw new ApiErrorHandler(
        500,
        "Error while uploading the thumbnail on cloudinary, please try again"
      );
    }
    // Convert duration to a number, assuming it can be a string or a number
    const duration =
      typeof cloudinaryVideoUrl.duration === "string"
        ? parseFloat(cloudinaryVideoUrl.duration)
        : cloudinaryVideoUrl.duration;

    const VideoPublicId = cloudinaryVideoUrl?.public_id;
    const ThumbNailPublicId = cloudinaryThumbnailUrl?.public_id;
    // create a new document in video collection
    const newVideo = await Video.create({
      videoFile: cloudinaryVideoUrl.url,
      thumbNail: cloudinaryThumbnailUrl.url,
      VideoPublicId,
      ThumbNailPublicId,
      owner: new mongoose.Types.ObjectId(req.user?._id),
      title: title,
      description,
      duration: duration,
    });
    //console.log("new video: ", newVideo);
    //console.log("video detail: ", cloudinaryVideoUrl);
    //console.log("thumbnail details: ", cloudinaryThumbnailUrl);
    return res.status(200).json(new ApiResponce(200, newVideo, "success"));
  } catch (error) {
    console.log("error while uploading the video or thumbnail endpoint", error);

    throw new ApiErrorHandler(
      error.statusCode || 500,
      error?.message || "internal server error upload video"
    );
  } finally {
    console.log("enter in finally");
    if (localVideoPath && fs.existsSync(localVideoPath)) {
      console.log("enter in finally local video variable");
      fs.unlinkSync(localVideoPath);
    }
    if (localThumbnailPath && fs.existsSync(localThumbnailPath)) {
      console.log("enter in finally local thumbanil variable");
      fs.unlinkSync(localThumbnailPath);
    }
  }
});

const getAllVideos = asyncHandler(async (req, res) => {
  // hit query to videos collections and get all videos documents
  try {
    const getVideos = await Video.find(
      {},
      "videoFile thumbNail title duration views owner"
    );
    if (!getVideos || getVideos.length === 0) {
      throw new ApiErrorHandler(404, "No video found");
    }
    res.status(200).json(new ApiResponce(200, getVideos, "all videos Fetched"));
  } catch (error) {
    console.log("Error in GetAllVideos ::", error?.message);
    throw new ApiErrorHandler(
      error.statusCode || 500,
      error?.message || "internal server error in getAll videos"
    );
  }
});

const userSpecificVideos = asyncHandler(async (req, res) => {
  // get user Id
  // check userId present and valid
  // query to db for specific user id records/docs in videos collection
  const userId = req.user?._id;
  if (!userId) {
    throw new ApiErrorHandler(404, "User is not authorized or login");
  }
  try {
    const userVideos = await Video.find({ owner: userId });
    if (!userVideos || userVideos.length === 0) {
      return res
        .status(200)
        .json(new ApiResponce(200, userVideos, "user do not have any video"));
    }
    return res
      .status(200)
      .json(new ApiResponce(200, userVideos, "videos fetched sucessfully"));
  } catch (error) {
    throw new ApiErrorHandler(
      error.statusCode || 500,
      error?.message || "internal server error in get user videos"
    );
  }
});

const updateTitleAndDescription = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  const { videoId } = req.params;
  if (!title || !description) {
    throw new ApiErrorHandler(
      404,
      "title and descriptions are mendatory fields"
    );
  }

  if (!videoId || !mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiErrorHandler(400, "Invalid videoId");
  }
  try {
    const updatedVideo = await Video.findOneAndUpdate(
      { _id: videoId, owner: req.user?._id },
      {
        $set: {
          title,
          description,
        },
      },
      {
        new: true,
      }
    );
    if (!updatedVideo) {
      throw new ApiErrorHandler(
        404,
        "video does not exist or Unauthorized User"
      );
    }

    return res
      .status(200)
      .json(
        new ApiResponce(
          200,
          updatedVideo,
          "title and desc updated successfully"
        )
      );
  } catch (error) {
    throw new ApiErrorHandler(
      401,
      error?.message || "Error while video details update"
    );
  }
});

const updateThumbNail = asyncHandler(async (req, res) => {
  try {
    if (!req.file || Object.keys(req.file).length === 0) {
      throw new ApiErrorHandler(404, "please select the thumb nail picture");
    }
    var localPathThumbNail = req.file?.path;
    if (!localPathThumbNail) {
      throw new ApiErrorHandler(400, "error in local path of thumbnail");
    }
    const { videoId } = req.params;
    if (!videoId || !mongoose.Types.ObjectId.isValid(videoId)) {
      throw new ApiErrorHandler(404, "Video Id is not valid");
    }
    const result = await Video.findOne({ _id: videoId, owner: req.user?._id });
    if (!result || result.length === 0) {
      return res
        .status(200)
        .json(
          new ApiResponce(
            200,
            result,
            "video does not exist or Unathourized user"
          )
        );
    }
    const { deleteImageResponse } = await deleteFromCloudinary([
      result.ThumbNailPublicId,
    ]);
    if (!deleteImageResponse) {
      throw new ApiErrorHandler(
        "500",
        "Problem while delteing file from cloudinary, please try again"
      );
    }
    //console.log("thumbNial deletion response: ", deleteImageResponse);

    const cloudniaryThumbNailUpdate =
      await uploadOnCloudinary(localPathThumbNail);
    if (!cloudniaryThumbNailUpdate) {
      throw new ApiErrorHandler(
        500,
        "Error while updating the Thumbnail on cloudinary"
      );
    }
    const updatedVideoObj = await Video.findByIdAndUpdate(
      videoId,
      {
        $set: {
          thumbNail: cloudniaryThumbNailUpdate.url,
          ThumbNailPublicId: cloudniaryThumbNailUpdate.public_id,
        },
      },
      {
        new: true,
      }
    );
    res
      .status(200)
      .json(
        new ApiResponce(200, updatedVideoObj, "ThumbNail successfully updated")
      );
  } finally {
    if (localPathThumbNail && fs.existsSync(localPathThumbNail)) {
      //console.log("enter in finally if condition");
      fs.unlinkSync(localPathThumbNail);
    }
  }
});

const deleteVideo = asyncHandler(async (req, res) => {
  // get user Id
  // get video id which needs to be delted
  // get all user docs from video collection
  // find and delte the video/doc from user collection
  // retunr responce updated collection
  const userId = req.user?._id;
  const { videoId } = req.params;

  if (!userId) {
    throw new ApiErrorHandler(400, "user not found");
  }
  if (!videoId || !mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiErrorHandler(404, "video id is invalid");
  }
  try {
    // check if the user video exist or not
    const userVideo = await Video.findOne({ _id: videoId, owner: userId });
    if (!userVideo || userVideo.length === 0) {
      return res
        .status(404)
        .json(new ApiResponce(404, null, "video not found or Unauthorized"));
    }
    // Call the delete function for Cloudinary
    const { deleteVideoResponse, deleteImageResponse } =
      await deleteFromCloudinary([
        userVideo.VideoPublicId,
        userVideo.ThumbNailPublicId,
      ]);
    if (!deleteVideoResponse || !deleteImageResponse) {
      throw new ApiErrorHandler(
        "500",
        "Problem while delteing file from cloudinary, please try again"
      );
    }
    //console.log("Video deletion response: ", deleteVideoResponse);
    //console.log("Image deletion response: ", deleteImageResponse);
    // delte the video
    await Video.deleteOne({ _id: videoId, owner: userId });

    // Remove references to the deleted video from all playlists

    await Playlist.updateMany(
      { videos: videoId },
      { $pull: { videos: videoId } }
    );

    // Remove comments associated with the deleted video
    await Comment.deleteMany({ video: videoId });
    //remove likes from like model associated with this video
    await Like.deleteMany({ video: videoId });
    // get refreshed collection of videos
    const userAllvideos = await Video.find({ owner: userId });
    return res
      .status(200)
      .json(new ApiResponce(200, userAllvideos, "Video deleted Successfully"));
    //const deleteVideo = userAllvideos.
  } catch (error) {
    throw new ApiErrorHandler(
      error.statusCode || 500,
      error?.message || "internal server error"
    );
  }
});

// get videobyID

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const userId = req.user?._id;
  if (!videoId || !mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiErrorHandler(404, "Invalid Video Id");
  }
  if (!userId) {
    throw new ApiErrorHandler(401, "User is not authorized or login");
  }
  try {
    const userVideos = await Video.find({ _id: videoId });
    if (!userVideos || userVideos.length === 0) {
      return res
        .status(200)
        .json(new ApiResponce(200, userVideos || [], "Video not found"));
    }
    // if (!userVideos || userVideos.owner.toString() !== userId.toString()) {
    //   throw new ApiErrorHandler(403, "User is not authorized to view this video");
    // }

    return res
      .status(200)
      .json(new ApiResponce(200, userVideos, "videos fetched sucessfully"));
  } catch (error) {
    throw new ApiErrorHandler(
      error.statusCode || 500,
      error?.message || "internal server error in get user videos"
    );
  }
});

const likeVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!req.user?._id) {
    throw new ApiErrorHandler(401, "user not found, please login");
  }
  if (!videoId || !mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiErrorHandler(404, "video id is invalid");
  }
  try {
    // Check if the user has already liked the video
    const existingLike = await Like.findOne({
      video: videoId,
      likedBy: req.user._id,
    });

    if (existingLike) {
      throw new ApiErrorHandler(400, "User has already liked this video");
    }
    const likeDoc = await Like.create({
      video: videoId,
      likedBy: req.user._id,
    });
    if (!likeDoc) {
      throw new ApiErrorHandler(401, "Invalid video or unathorized user");
    }
    return res
      .status(200)
      .json(new ApiResponce(200, likeDoc, "Liked Successfully"));
  } catch (error) {
    throw new ApiErrorHandler(
      error.statusCode || 500,
      error?.message || "internal server error while like the video"
    );
  }
});

export {
  uploadVideo,
  updateThumbNail,
  updateTitleAndDescription,
  getAllVideos,
  userSpecificVideos,
  deleteVideo,
  likeVideo,
  getVideoById,
};
