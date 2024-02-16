import mongoose, { Schema } from "mongoose";
import mongooseAggregate from "mongoose-aggregate-paginate-v2";

const subscriptionSchema = new mongoose.Schema(
  {
    subscriber: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    channel: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);
subscriptionSchema.plugin(mongooseAggregate);
export const Subscription = mongoose.model("Subscription", subscriptionSchema);
