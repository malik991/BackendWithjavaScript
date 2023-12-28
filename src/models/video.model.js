import mongoose, { Schema } from "mongoose";
import mongooseAggregate from "mongoose-aggregate-paginate-v2";

const videoSchema = new mongoose.Schema(
  {
    videoFile: {
      type: String, // cloudiner URL
      required: true,
    },
    thumbNail: {
      type: String, // cloudiner URL
      required: true,
    },
    VideoPublicId: {
      type: String, // cloudinary public_id
      required: true,
    },
    ThumbNailPublicId: {
      type: String, // cloudinary public_id
      required: true,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    duration: {
      type: Number,
      required: true,
    },
    views: {
      type: Number,
      default: 0,
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// now jusr before the export we use aggregation pipline by adding like a plugin,
// which boost the power of our query execution on advance level
// plugin is just a hook like pre hook for schema from mongoose
videoSchema.plugin(mongooseAggregate);

export const Video = mongoose.model("Video", videoSchema);
