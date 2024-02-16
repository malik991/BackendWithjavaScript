import mongoose, { mongo } from "mongoose";
import { Subscription } from "../models/subscription.model.js";
import { ApiErrorHandler } from "../utils/ApiErrorHandler.js";
import { ApiResponce } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";

const toggledSubscription = asyncHandler(async (req, res) => {
  const { channelUserName } = req.params;
  //console.log("hello subscribeToChannel: ", channelUserName);
  if (!channelUserName || !channelUserName.trim()) {
    throw new ApiErrorHandler(
      404,
      "channel does not exit, while subscribing a channel"
    );
  }
  if (!req.user?._id) {
    throw new ApiErrorHandler(404, "please login, to subscribe to any channel");
  }
  try {
    const findChannel = await User.findOne({
      userName: channelUserName.toLowerCase(),
    });
    if (!findChannel) {
      throw new ApiErrorHandler(404, "channel not found ");
    }

    // check already subscribed or not
    const exisitingSubscription = await Subscription.findOne({
      channel: findChannel._id,
      subscriber: req.user?._id,
    });
    if (exisitingSubscription) {
      //throw new ApiErrorHandler(400, "Already subscribed to this channel");
      await Subscription.deleteOne({
        channel: findChannel._id,
        subscriber: new mongoose.Types.ObjectId(req.user._id),
      });
      return res
        .status(200)
        .json(new ApiResponce(200, {}, "Unsubscribed Successfully"));
    }

    // new subscriber
    const newSubscriber = await Subscription.create({
      channel: findChannel._id,
      subscriber: new mongoose.Types.ObjectId(req.user._id),
    });
    return res
      .status(200)
      .json(new ApiResponce(200, newSubscriber, "Succussfully suscribed"));
  } catch (error) {
    throw new ApiErrorHandler(
      error.statusCode || 500,
      error?.message || "internal server error while subscribeing a channel"
    );
  }
});

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  let pipeline = [];
  if (!channelId || !mongoose.Types.ObjectId.isValid(channelId)) {
    throw new ApiErrorHandler(404, "channel id does not exist, Invalid Id");
  }
  try {
    const { page = 1, limit = 4, query, sortBy, sortType } = req.query;
    pipeline.push({
      $match: {
        channel: new mongoose.Types.ObjectId(channelId),
      },
    });
    pipeline.push({ $sort: { createdAt: -1 } });
    pipeline.push(
      {
        $lookup: {
          from: "users",
          localField: "subscriber",
          foreignField: "_id",
          as: "subscriberDetails",
        },
      },
      {
        $unwind: {
          path: "$subscriberDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          subscriber: {
            _id: "$subscriberDetails._id",
            fullName: "$subscriberDetails.fullName",
            avatar: "$subscriberDetails.avatar",
            userName: "$subscriberDetails.userName",
          },
        },
      },
      {
        $project: {
          subscriberDetails: 0,
        },
      }
    );
    const getSubscribersListAggregate = Subscription.aggregate(pipeline);
    if (!getSubscribersListAggregate) {
      return res.status(200).json(new ApiResponce(200, [], "No subscriber"));
    }
    const result = await Subscription.aggregatePaginate(
      getSubscribersListAggregate,
      {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
      }
    );
    if (!result) {
      throw new ApiErrorHandler(
        500,
        "error while fetching subscriber of a channel."
      );
    }
    return res
      .status(200)
      .json(
        new ApiResponce(200, result, "Subscribers list fetched successfully")
      );
  } catch (error) {
    throw new ApiErrorHandler(
      error.statusCode || 500,
      error?.message || "internal server error while fetching a channel by Id"
    );
  }
});
// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { subscriberId } = req.params;
  if (!subscriberId || !mongoose.Types.ObjectId.isValid(subscriberId)) {
    throw new ApiErrorHandler(404, "subscriber does not exist");
  }
  try {
    const getChannelList = await Subscription.find({
      subscriber: subscriberId,
    });
    if (!getChannelList || getChannelList.length === 0) {
      return res
        .status(200)
        .json(
          new ApiResponce(
            200,
            getChannelList || [],
            "User do not subscribe any channel"
          )
        );
    }
    return res
      .status(200)
      .json(
        new ApiResponce(
          200,
          getChannelList,
          "channel list fetched successfully"
        )
      );
  } catch (error) {
    error.statusCode || 500,
      error?.message ||
        "internal server error while fetching a subscriber by Id";
  }
});
export {
  toggledSubscription,
  getUserChannelSubscribers,
  getSubscribedChannels,
};

// const unsubscribeFromChannel = asyncHandler(async (req, res) => {
//   const { channelUserName } = req.params;
//   // console.log("hello subscribeToChannel: ", channelUserName);
//   if (!channelUserName || !channelUserName.trim()) {
//     throw new ApiErrorHandler(
//       404,
//       "channel does not exit, while Unsubscribing a channel"
//     );
//   }
//   if (!req.user?._id) {
//     throw new ApiErrorHandler(
//       404,
//       "please login, to Unsubscribe to any channel"
//     );
//   }
//   try {
//     const findChannel = await User.findOne({
//       userName: channelUserName.toLowerCase(),
//     });
//     if (!findChannel) {
//       throw new ApiErrorHandler(404, "channel not found ");
//     }

//     // check subscribed or not
//     const subscription = await Subscription.findOne({
//       channel: findChannel._id,
//       subscriber: req.user?._id,
//     });
//     if (!subscription) {
//       throw new ApiErrorHandler(400, "You are not subscribed to this channel");
//     }

//     // Unsubscribe from the channel
//     await Subscription.deleteOne({
//       channel: findChannel._id,
//       subscriber: new mongoose.Types.ObjectId(req.user._id),
//     });
//     return res
//       .status(200)
//       .json(new ApiResponce(200, null, "Succussfully Unsuscribed"));
//   } catch (error) {
//     throw new ApiErrorHandler(
//       error.statusCode || 500,
//       error?.message || "internal server error while Unsubscribeing a channel"
//     );
//   }
// });
