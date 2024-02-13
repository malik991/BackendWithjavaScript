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
import { getAllComments } from "./comment.controller.js";

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
    const { title, description, isPublished } = req.body;

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
      isPublished: isPublished,
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
  try {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;

    let pipeline = [];

    if (query) {
      console.log(query);
      pipeline.push({
        $search: {
          index: "search-videos",
          text: {
            query: query,
            path: ["title", "description"],
          },
        },
      });
    }

    if (userId) {
      pipeline.push({
        $match: {
          owner: new mongoose.Types.ObjectId(userId),
        },
      });
    }

    pipeline.push({ $match: { isPublished: true } });

    if (sortBy && sortType) {
      //console.log(sortBy, sortType);
      pipeline.push({
        $sort: {
          [sortBy]: sortType === "asc" ? 1 : -1,
        },
      });
    } else {
      pipeline.push({ $sort: { createdAt: -1 } });
    }
    pipeline.push(
      {
        $lookup: {
          from: "users",
          localField: "owner",
          foreignField: "_id",
          as: "ownerDetails",
        },
      },
      {
        // destruct all docs
        $unwind: {
          path: "$ownerDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          owner: {
            _id: "$ownerDetails._id",
            fullName: "$ownerDetails.fullName",
            avatar: "$ownerDetails.avatar",
          },
        },
      },
      {
        $project: {
          ownerDetails: 0, // Exclude the ownerDetails subdocument
        },
      }
    );
    // Add $lookup stage to get total comments for each video
    pipeline.push(
      {
        $lookup: {
          from: "comments",
          localField: "_id",
          foreignField: "video",
          as: "comments",
        },
      },
      {
        $addFields: {
          totalComments: { $size: "$comments" },
        },
      },
      {
        $project: {
          comments: 0, // Exclude the comments array from the final output
        },
      }
    );
    // Add $lookup stage to get total likes for each video
    pipeline.push(
      {
        $lookup: {
          from: "likes",
          localField: "_id",
          foreignField: "video",
          as: "likes",
        },
      },
      {
        $addFields: {
          totalLikes: { $size: "$likes" },
        },
      },
      {
        $project: {
          likes: 0, // Exclude the comments array from the final output
        },
      }
    );
    const videosAggregate = Video.aggregate(pipeline);
    //console.log(videosAggregate);
    const result = await Video.aggregatePaginate(videosAggregate, {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    });
    // console.log(result);
    /* return result will be type of below
  
      result.docs
      result.totalDocs = 100
      result.limit = 10
      result.page = 1
      result.totalPages = 10
      result.hasNextPage = true
      result.nextPage = 2
      result.hasPrevPage = false
      result.prevPage = null
    */

    if (!result) {
      throw new ApiErrorHandler(
        500,
        "Something went wrong while fetching videos!!"
      );
    }

    return res
      .status(200)
      .json(new ApiResponce(200, result, "All videos fetched successfully!!"));
  } catch (error) {
    console.log("Error in GetAllVideos ::", error?.message);
    throw new ApiErrorHandler(
      error.statusCode || 500,
      error?.message || "internal server error in getAll videos"
    );
  }
});

const userSpecificVideos = asyncHandler(async (req, res) => {
  let pipeline = [];

  const userId = req.user?._id;
  if (!userId) {
    throw new ApiErrorHandler(404, "User is not authorized or login");
  }
  try {
    const { page = 1, limit = 10, query, sortBy, sortType } = req.query;
    pipeline.push({
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    });
    pipeline.push({ $sort: { createdAt: -1 } });
    pipeline.push(
      {
        $lookup: {
          from: "users",
          localField: "owner",
          foreignField: "_id",
          as: "ownerDetails",
        },
      },
      {
        // destruct all docs
        $unwind: {
          path: "$ownerDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          owner: {
            _id: "$ownerDetails._id",
            fullName: "$ownerDetails.fullName",
            avatar: "$ownerDetails.avatar",
          },
        },
      }
      // {
      //   $project: {
      //     ownerDetails: 0, // Exclude the ownerDetails subdocument
      //   },
      // }
    );
    // Add $lookup stage to get total comments for each video
    pipeline.push(
      {
        $lookup: {
          from: "comments",
          localField: "_id",
          foreignField: "video",
          as: "comments",
        },
      },
      {
        $addFields: {
          totalComments: { $size: "$comments" },
        },
      }
      // {
      //   $project: {
      //     comments: 0, // Exclude the comments array from the final output
      //   },
      // }
    );
    // Add $lookup stage to get total likes for each video
    pipeline.push(
      {
        $lookup: {
          from: "likes",
          localField: "_id",
          foreignField: "video",
          as: "likes",
        },
      },
      {
        $addFields: {
          totalLikes: { $size: "$likes" },
        },
      },
      {
        $project: {
          likes: 0, // Exclude the comments array from the final output
          ownerDetails: 0,
          comments: 0,
        },
      }
    );
    const videosAggregate = Video.aggregate(pipeline);
    const result = await Video.aggregatePaginate(videosAggregate, {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    });
    if (!result) {
      throw new ApiErrorHandler(500, "error while fetching user's videos");
    }

    return res
      .status(200)
      .json(
        new ApiResponce(200, result, "User's videos fetched successfully!!")
      );
  } catch (error) {
    throw new ApiErrorHandler(
      error.statusCode || 500,
      error?.message || "internal server error in get user videos"
    );
  }
});

const updateTitleAndDescription = asyncHandler(async (req, res) => {
  const { title, description, isPublished } = req.body;
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
          isPublished,
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
    //const userVideos = await Video.findOne({ _id: videoId });
    // Use findOneAndUpdate to atomically increment views and get the updated document
    const userVideo = await Video.findById(
      videoId
      //{ $inc: { views: 1 } }, // Increment the views count
      //{ new: true } // Return the updated document
    );
    if (!userVideo) {
      return res
        .status(200)
        .json(new ApiResponce(200, userVideo || [], "Video not found"));
    }

    return res
      .status(200)
      .json(new ApiResponce(200, userVideo, "videos fetched sucessfully"));
  } catch (error) {
    throw new ApiErrorHandler(
      error.statusCode || 500,
      error?.message || "internal server error in get user videos"
    );
  }
});

// increase video views
const watchVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!videoId || !mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiErrorHandler(404, "Invalid Video Id");
  }

  try {
    const videoViews = await Video.findOneAndUpdate(
      { _id: videoId },
      { $inc: { views: 1 } }, // Increment the views count
      { new: true } // Return the updated document
    );
    if (!videoViews) {
      return res.status(400).json(new ApiResponce(400, [], "Video not found"));
    }

    return res
      .status(200)
      .json(new ApiResponce(200, videoViews, "Video view updated"));
  } catch (error) {
    throw new ApiErrorHandler(
      error.statusCode || 500,
      error?.message || "internal server error in get user videos"
    );
  }
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!req.user?._id) {
    throw new ApiErrorHandler(401, "user not found , please login");
  }

  try {
    if (!videoId || !mongoose.Types.ObjectId.isValid(videoId)) {
      throw new ApiErrorHandler(400, "Invalid Video Id");
    }

    const video = await Video.findOne({ _id: videoId, owner: req.user?._id });
    if (!video) {
      throw new ApiErrorHandler(401, "Video not found, Unauthorized user");
    }

    video.isPublished = !video.isPublished;
    await video.save();

    return res
      .status(200)
      .json(new ApiResponce(200, video, "Publish status toggled successfully"));
  } catch (error) {
    throw new ApiErrorHandler(
      error.statusCode || 500,
      error.message || "Internal server error while toggling publish status"
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
  getVideoById,
  togglePublishStatus,
  watchVideo,
};
