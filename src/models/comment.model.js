import mongoose, { Schema } from "mongoose";
import mongooseAggregate from "mongoose-aggregate-paginate-v2";

const commentSchema = new mongoose.Schema(
  {
    content: {
      type: String,
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
  },
  { timestamps: true }
);

commentSchema.plugin(mongooseAggregate);

export const Comment = mongoose.model("Comment", commentSchema);
