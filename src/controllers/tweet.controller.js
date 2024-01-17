import { ApiErrorHandler } from "../utils/ApiErrorHandler.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponce } from "../utils/ApiResponse.js";
import { Tweet } from "../models/tweet.model.js";
import mongoose from "mongoose";

const createTweet = asyncHandler(async (req, res) => {
  const { content } = req.body;

  if (!content || content.length < 2 || content.length > 255) {
    throw new ApiErrorHandler(
      400,
      "Tweet must be between 2 and 255 characters."
    );
  }
  if (!req.user?._id) {
    throw new ApiErrorHandler(401, "Unauthorized, please login");
  }

  try {
    const newTweet = await Tweet.create({
      content,
      owner: req.user?._id,
    });

    return res
      .status(201)
      .json(new ApiResponce(201, newTweet, "Tweet created successfully"));
  } catch (error) {
    throw new ApiErrorHandler(
      error.statusCode || 500,
      error.message || "Internal server error while creating a tweet"
    );
  }
});

const getUserTweets = asyncHandler(async (req, res) => {
  if (!req.user?._id) {
    throw new ApiErrorHandler(401, "Unauthorized, please login");
  }

  try {
    //const user = await User.findById(userId);

    const userTweets = await Tweet.find({ owner: req.user?._id });

    if (!userTweets || userTweets.length === 0) {
      return res
        .status(200)
        .json(new ApiResponce(400, userTweets || [], "user Tweets not found"));
    }

    return res
      .status(200)
      .json(
        new ApiResponce(200, userTweets, "User tweets fetched successfully")
      );
  } catch (error) {
    throw new ApiErrorHandler(
      error.statusCode || 500,
      error.message || "Internal server error while fetching user tweets"
    );
  }
});

const updateTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  const { content } = req.body;

  if (
    !mongoose.Types.ObjectId.isValid(tweetId) ||
    !content ||
    content.length < 2 ||
    content.length > 255
  ) {
    throw new ApiErrorHandler(
      400,
      "Invalid tweet ID or Tweet must be between 2 and 255 characters."
    );
  }
  if (!req.user?._id) {
    throw new ApiErrorHandler(401, "Unauthorized, please login");
  }

  try {
    const updatedTweet = await Tweet.findOneAndUpdate(
      { _id: tweetId, owner: req.user._id },
      { $set: { content } },
      { new: true }
    );

    if (!updatedTweet) {
      throw new ApiErrorHandler(
        404,
        "Tweet not found or unauthorized to update."
      );
    }

    return res
      .status(200)
      .json(new ApiResponce(200, updatedTweet, "Tweet updated successfully"));
  } catch (error) {
    throw new ApiErrorHandler(
      error.statusCode || 500,
      error.message || "Internal server error while updating a tweet"
    );
  }
});

const deleteTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(tweetId) || !tweetId) {
    throw new ApiErrorHandler(400, "Invalid tweet ID.");
  }
  if (!req.user?._id) {
    throw new ApiErrorHandler(401, "Unauthorized, please login");
  }

  try {
    const deletedTweet = await Tweet.findOneAndDelete({
      _id: tweetId,
      owner: req.user._id,
    });

    if (!deletedTweet) {
      throw new ApiErrorHandler(
        404,
        "Tweet not found or unauthorized to delete."
      );
    }

    return res
      .status(200)
      .json(new ApiResponce(200, deletedTweet, "Tweet deleted successfully"));
  } catch (error) {
    throw new ApiErrorHandler(
      error.statusCode || 500,
      error.message || "Internal server error while deleting a tweet"
    );
  }
});

export { createTweet, getUserTweets, updateTweet, deleteTweet };
