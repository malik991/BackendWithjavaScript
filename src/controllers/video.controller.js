import mongoose from "mongoose";
import { Video } from "../models/video.model.js";
import { ApiErrorHandler } from "../utils/ApiErrorHandler.js";
import { ApiResponce } from "../utils/ApiResponse.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
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
    // create a new document in video collection
    const newVideo = await Video.create({
      videoFile: cloudinaryVideoUrl.url,
      thumbNail: cloudinaryThumbnailUrl.url,
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

const updateTitleAndDescription = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  const { videoId } = req.params;
  console.log("req param", req.params);
  console.log("video id: ", videoId);
  if (!title || !description) {
    throw new ApiErrorHandler(
      404,
      "title and descriptions are mendatory fields"
    );
  }
  if (!videoId || typeof videoId !== "string" || videoId.trim() === "") {
    throw new ApiErrorHandler(404, "video id empty or undefined");
  }
  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiErrorHandler(400, "Invalid videoId");
  }
  try {
    const updatedVideo = await Video.findByIdAndUpdate(
      videoId,
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
    console.log("updated video: ", updatedVideo);
    // if (!updatedVideo?.length) {
    //   throw new ApiErrorHandler(404, "video not found");
    // }
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
  req.file?.thumbNail[0].path;
});

export { uploadVideo, updateThumbNail, updateTitleAndDescription };
