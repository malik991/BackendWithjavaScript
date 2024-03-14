import mongoose, { Schema } from "mongoose";

// Define a separate Reply model
const replySchema = new mongoose.Schema(
  {
    replyContent: {
      type: String,
      required: true,
      trim: true,
    },
    parentCommentId: {
      // Reference to the parent comment
      type: Schema.Types.ObjectId,
      ref: "Comment",
    },
    parentReply: {
      // New field to store parent reply ID (optional)
      type: Schema.Types.ObjectId,
      ref: "Reply",
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

export const Reply = mongoose.model("Reply", replySchema);

// Comment.findById(commentId).populate('replies').then(comment => {
//     // comment object will now have populated replies array
//     console.log(comment);
//   });
