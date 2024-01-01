import mongoose from "mongoose";
import { Subscription } from "../models/subscription.model.js";
import { ApiErrorHandler } from "../utils/ApiErrorHandler.js";
import { ApiResponce } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";

const channelSubscription = asyncHandler(async (req, res) => {
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
      throw new ApiErrorHandler(400, "Already subscribed to this channel");
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

const unsubscribeFromChannel = asyncHandler(async (req, res) => {
  const { channelUserName } = req.params;
  // console.log("hello subscribeToChannel: ", channelUserName);
  if (!channelUserName || !channelUserName.trim()) {
    throw new ApiErrorHandler(
      404,
      "channel does not exit, while Unsubscribing a channel"
    );
  }
  if (!req.user?._id) {
    throw new ApiErrorHandler(
      404,
      "please login, to Unsubscribe to any channel"
    );
  }
  try {
    const findChannel = await User.findOne({
      userName: channelUserName.toLowerCase(),
    });
    if (!findChannel) {
      throw new ApiErrorHandler(404, "channel not found ");
    }

    // check subscribed or not
    const subscription = await Subscription.findOne({
      channel: findChannel._id,
      subscriber: req.user?._id,
    });
    if (!subscription) {
      throw new ApiErrorHandler(400, "You are not subscribed to this channel");
    }

    // Unsubscribe from the channel
    await Subscription.deleteOne({
      channel: findChannel._id,
      subscriber: new mongoose.Types.ObjectId(req.user._id),
    });
    return res
      .status(200)
      .json(new ApiResponce(200, null, "Succussfully Unsuscribed"));
  } catch (error) {
    throw new ApiErrorHandler(
      error.statusCode || 500,
      error?.message || "internal server error while Unsubscribeing a channel"
    );
  }
});

export { channelSubscription, unsubscribeFromChannel };
