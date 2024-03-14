import mongoose, { Schema } from "mongoose";
import mongooseAggregate from "mongoose-aggregate-paginate-v2";

const commentSchema = new mongoose.Schema(
  {
    content: {
      type: String,
      required: true,
      trim: true,
    },
    video: {
      type: Schema.Types.ObjectId,
      ref: "Video",
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    replies: [
      // Array to store Reply objectIds
      {
        type: Schema.Types.ObjectId,
        ref: "Reply", // Reference the Reply model
      },
    ],
  },
  { timestamps: true }
);

commentSchema.plugin(mongooseAggregate);

export const Comment = mongoose.model("Comment", commentSchema);
