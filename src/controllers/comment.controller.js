import mongoose from "mongoose";
import { Comment } from "../models/comment.model.js";
import { Like } from "../models/like.model.js";
import { ApiErrorHandler } from "../utils/ApiErrorHandler.js";
import { ApiResponce } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const addComment = asyncHandler(async (req, res) => {
  const { content } = req.body;
  const { videoId } = req.params;
  if (!content || content.length < 2 || content.length > 255) {
    throw new ApiErrorHandler(
      404,
      "comment must be between 2 and 255 characters"
    );
  }
  if (!videoId || !mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiErrorHandler(404, "video not found, Invalid video Id.");
  }
  if (!req.user?._id) {
    throw new ApiErrorHandler(401, "user not found, please login");
  }
  try {
    const newComment = await Comment.create({
      content,
      video: videoId,
      owner: req.user?._id,
    });
    if (!newComment) {
      throw new ApiErrorHandler(404, "comment not added, please try again");
    }
    return res
      .status(200)
      .json(new ApiResponce(200, newComment, "comment added successfully"));
  } catch (error) {
    throw new ApiErrorHandler(
      error?.statusCode || 500,
      error?.message || "internal server error while inserting a comment"
    );
  }
});

const editComment = asyncHandler(async (req, res) => {
  const { content } = req.body;
  const { contentId } = req.params;
  if (!content || content.length < 2 || content.length > 255) {
    throw new ApiErrorHandler(
      404,
      "comment must be between 2 and 255 characters"
    );
  }
  if (!contentId || !mongoose.Types.ObjectId.isValid(contentId)) {
    throw new ApiErrorHandler(404, "video not found, Invalid Video Id.");
  }
  if (!req.user?._id) {
    throw new ApiErrorHandler(401, "user not found, please login");
  }
  try {
    const updateComment = await Comment.findOneAndUpdate(
      {
        owner: req.user._id,
        _id: contentId,
      },
      {
        $set: {
          content,
        },
      },
      {
        new: true,
      }
    );
    if (!updateComment) {
      throw new ApiErrorHandler(
        401,
        "Comment not updated. Unauthorized user or comment not found."
      );
    }
    return res
      .status(200)
      .json(
        new ApiResponce(200, updateComment, "comment updated successfully")
      );
  } catch (error) {
    throw new ApiErrorHandler(
      error?.statusCode || 500,
      error?.message || "internal server error while updating a comment"
    );
  }
});

const deleteComment = asyncHandler(async (req, res) => {
  const { contentId } = req.params;
  if (!contentId || !mongoose.Types.ObjectId.isValid(contentId)) {
    throw new ApiErrorHandler(404, "comment not found, Invalid comment Id");
  }
  if (!req.user?._id) {
    throw new ApiErrorHandler(401, "user not found, please login");
  }
  try {
    const deleteDocument = await Comment.findOneAndDelete(
      {
        _id: contentId,
        owner: req.user?._id,
      },
      { new: true }
    );
    if (!deleteDocument) {
      throw new ApiErrorHandler(401, "comment not exist or anauthorized users");
    }
    // Remove likes associated with the deleted comment
    await Like.deleteMany({ comment: contentId });
    return res
      .status(200)
      .json(
        new ApiResponce(200, deleteDocument, "comment deleted sucessfully")
      );
  } catch (error) {
    throw new ApiErrorHandler(
      error?.statusCode || 500,
      error?.message || "internal server error while deleting a comment"
    );
  }
});

const getAllComments = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { page = 1, limit = 10 } = req.query;
  if (!videoId || !mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiErrorHandler(404, "Invalid Video Id");
  }
  try {
    const totalComments = await Comment.countDocuments({ video: videoId });
    if (totalComments === 0) {
      return res
        .status(200)
        .json(new ApiResponce(200, [], "No comments available for this video"));
    }
    let pipeline = [];
    pipeline.push(
      {
        $skip: (page - 1) * parseInt(limit),
      },
      {
        $limit: parseInt(limit),
      },
      {
        $lookup: {
          from: "users",
          localField: "owner",
          foreignField: "_id",
          as: "ownerDetails",
        },
      },
      {
        $unwind: "$ownerDetails",
      },
      {
        $project: {
          content: 1,
          owner: {
            _id: "$ownerDetails._id",
            fullName: "$ownerDetails.fullName",
            avatar: "$ownerDetails.avatar",
          },
        },
      }
    );
    const allComments = await Comment.aggregate(pipeline);

    if (!allComments || allComments.length === 0) {
      return res
        .status(400)
        .json(new ApiResponce(400, [], "comments not available"));
    }
    // Provide pagination information in the response
    const response = new ApiResponce(
      200,
      { comments: allComments, totalComments },
      "Comments fetched successfully"
    );
    return res.status(200).json(response);
  } catch (error) {
    throw new ApiErrorHandler(
      error?.statusCode || 500,
      error?.message || "internal server error while fetching comments"
    );
  }
});

export { addComment, editComment, deleteComment, getAllComments };
