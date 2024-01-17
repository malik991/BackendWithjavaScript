import mongoose from "mongoose";
import { Video } from "../models/video.model.js";
import { Subscription } from "../models/subscription.model.js";
import { Like } from "../models/like.model.js";
import { ApiResponce } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiErrorHandler } from "../utils/ApiErrorHandler.js";

const getChannelStats = asyncHandler(async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      throw new ApiErrorHandler(400, "please login, user not found");
    }

    // Get total video views
    const totalVideoViews = await Video.aggregate([
      {
        $match: { owner: new mongoose.Types.ObjectId(userId) },
      },
      {
        $group: {
          _id: null,
          totalViews: { $sum: "$views" },
        },
      },
    ]);

    // Get total subscribers
    const totalSubscribers = await Subscription.countDocuments({
      channel: new mongoose.Types.ObjectId(userId),
    });

    // Get total videos
    const totalVideos = await Video.countDocuments({ owner: userId });

    // Get total likes on videos
    //1: get all the videos own by the loggin user
    const userVideos = await Video.find({ owner: userId }, "_id");
    if (!userVideos || userVideos.length === 0) {
      return res
        .status(200)
        .json(
          new ApiResponce(200, userVideos || [], "user do not have any video")
        );
    }
    // 2: find like associated with these video Ids
    const totalLikes = await Like.countDocuments({
      video: { $in: userVideos.map((video) => video._id) },
    });

    // const totalLikes = await Like.countDocuments({
    //   "video.owner": mongoose.Types.ObjectId(userId),
    // });

    return res.status(200).json(
      new ApiResponce(
        200,
        {
          // uses the Nullish Coalescing Operator ??
          totalVideoViews: totalVideoViews?.[0]?.totalViews ?? 0,
          totalSubscribers: totalSubscribers ?? 0,
          totalVideos: totalVideos ?? 0,
          totalLikes: totalLikes ?? 0,
        },
        "Channel stats fetched successfully"
      )
    );
  } catch (error) {
    throw new ApiErrorHandler(
      error.statusCode || 500,
      error.message || "Internal server error while fetching channel stats"
    );
  }
});

const getChannelVideos = asyncHandler(async (req, res) => {
  try {
    if (!req.user?._id) {
      throw new ApiErrorHandler(400, "user not found, login please");
    }

    // Get all videos uploaded by the channel
    const channelVideos = await Video.find({ owner: req.user?._id });

    if (!channelVideos || channelVideos.length === 0) {
      return res
        .status(200)
        .json(
          new ApiResponce(
            200,
            channelVideos || [],
            "this channel do not have any video Yet"
          )
        );
    }

    return res
      .status(200)
      .json(
        new ApiResponce(
          200,
          channelVideos,
          "Channel videos fetched successfully"
        )
      );
  } catch (error) {
    throw new ApiErrorHandler(
      error.statusCode || 500,
      error.message || "Internal server error while fetching channel videos"
    );
  }
});

export { getChannelStats, getChannelVideos };
