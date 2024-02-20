import mongoose, { Schema } from "mongoose";
import mongooseAggregate from "mongoose-aggregate-paginate-v2";

const playlistSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    coverImage: {
      type: String, // cloudiner URL
    },
    coverImagePublicId: {
      type: String, // cloudinary public_id
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
    videos: [
      {
        type: Schema.Types.ObjectId,
        ref: "Video",
      },
    ],
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

playlistSchema.plugin(mongooseAggregate);
export const Playlist = mongoose.model("Playlist", playlistSchema);
