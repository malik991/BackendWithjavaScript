import { ApiErrorHandler } from "../utils/ApiErrorHandler.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponce } from "../utils/ApiResponse.js";
import { Like } from "../models/like.model.js";
import mongoose from "mongoose";

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: toggle like on video
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
      //throw new ApiErrorHandler(400, "User has already liked this video");
      await Like.deleteOne({ video: videoId });
      return res
        .status(200)
        .json(new ApiResponce(200, [], "video disliked Successfully"));
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
      .json(new ApiResponce(200, likeDoc, "video Liked Successfully"));
  } catch (error) {
    throw new ApiErrorHandler(
      error.statusCode || 500,
      error?.message || "internal server error while like the video"
    );
  }
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  //TODO: toggle like on comment
  if (!req.user?._id) {
    throw new ApiErrorHandler(401, "user not found, please login");
  }
  if (!commentId || !mongoose.Types.ObjectId.isValid(commentId)) {
    throw new ApiErrorHandler(404, "comment id is invalid");
  }
  try {
    // Check if the user has already liked the video
    const existingLike = await Like.findOne({
      comment: commentId,
      likedBy: req.user._id,
    });

    if (existingLike) {
      //throw new ApiErrorHandler(400, "User has already liked this video");
      await Like.deleteOne({ comment: commentId });
      return res
        .status(200)
        .json(new ApiResponce(200, [], "comment disliked Successfully"));
    }
    const likeDoc = await Like.create({
      comment: commentId,
      likedBy: req.user._id,
    });
    if (!likeDoc) {
      throw new ApiErrorHandler(401, "Invalid action or unathorized user");
    }
    return res
      .status(200)
      .json(new ApiResponce(200, likeDoc, "comment Liked Successfully"));
  } catch (error) {
    throw new ApiErrorHandler(
      error.statusCode || 500,
      error?.message || "internal server error while like the comment"
    );
  }
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  //TODO: toggle like on tweet
  if (!req.user?._id) {
    throw new ApiErrorHandler(401, "user not found, please login");
  }
  if (!tweetId || !mongoose.Types.ObjectId.isValid(tweetId)) {
    throw new ApiErrorHandler(404, "Tweet id is invalid");
  }
  try {
    // Check if the user has already liked the tweet
    const existingLike = await Like.findOne({
      tweet: tweetId,
      likedBy: req.user._id,
    });

    if (existingLike) {
      //throw new ApiErrorHandler(400, "User has already liked this video");
      await Like.deleteOne({ tweet: tweetId });
      return res
        .status(200)
        .json(new ApiResponce(200, [], "tweet disliked Successfully"));
    }
    const likeDoc = await Like.create({
      tweet: tweetId,
      likedBy: req.user._id,
    });
    if (!likeDoc) {
      throw new ApiErrorHandler(401, "Invalid action or unathorized user");
    }
    return res
      .status(200)
      .json(new ApiResponce(200, likeDoc, "Tweet Liked Successfully"));
  } catch (error) {
    throw new ApiErrorHandler(
      error.statusCode || 500,
      error?.message || "internal server error while like the Tweet"
    );
  }
});

const getLikedVideos = asyncHandler(async (req, res) => {
  //TODO: get all liked videos of a specific user
  if (!req.user?._id) {
    throw new ApiErrorHandler(401, "please login again, user not exist");
  }
  try {
    //video: { $exists: true }: This part of the query ensures that only likes on videos
    // are considered. It filters out documents where the video field exists
    //(i.e., is not null or undefined). This is useful if your Like collection may also include likes on other types of content, like comments or tweets.
    const likedVideos = await Like.find({
      likedBy: req.user?._id,
      video: { $exists: true },
    }).populate("video");
    // .populate('video')
    //This is a Mongoose method used to replace the video field in each document
    // with the actual details of the liked video. By populating the video field,
    //you retrieve the full information about the video that was liked. This is particularly useful when you want to get details from the referenced document
    if (!likedVideos || likedVideos.length === 0) {
      return res
        .status(200)
        .json(
          new ApiResponce(201, likedVideos || [], "No liked videos available")
        );
    }
    return res
      .status(200)
      .json(
        new ApiResponce(200, likedVideos, "liked videos fetched successfully")
      );
  } catch (error) {
    throw new ApiErrorHandler(
      error.statusCode || 500,
      error?.message || "internal server error while fetching all liked videos"
    );
  }
});

export { toggleCommentLike, toggleTweetLike, toggleVideoLike, getLikedVideos };
