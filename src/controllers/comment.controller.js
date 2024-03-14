import mongoose from "mongoose";
import { Comment } from "../models/comment.model.js";
import { Reply } from "../models/reply.model.js";
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
  let pipeline = [];
  try {
    pipeline.push({
      $match: {
        video: new mongoose.Types.ObjectId(videoId),
      },
    });

    const newComment = await Comment.create({
      content,
      video: videoId,
      owner: req.user?._id,
    });
    if (!newComment) {
      throw new ApiErrorHandler(404, "comment not added, please try again");
    }
    pipeline = [
      {
        $match: {
          _id: newComment._id,
          owner: newComment.owner,
        },
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
        $unwind: {
          path: "$ownerDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          owner: {
            _id: "$ownerDetails._id",
            userName: "$ownerDetails.userName",
            fullName: "$ownerDetails.fullName",
            avatar: "$ownerDetails.avatar",
          },
        },
      },
      {
        $project: {
          ownerDetails: 0, // Exclude the ownerDetails subdocument
        },
      },
    ];

    const newCommentAndOwnerDetail = await Comment.aggregate(pipeline);

    return res
      .status(200)
      .json(
        new ApiResponce(
          200,
          newCommentAndOwnerDetail,
          "comment added successfully"
        )
      );
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
      const updateParentReply = await Reply.findOneAndUpdate(
        {
          owner: req.user._id,
          _id: contentId,
        },
        {
          $set: {
            replyContent: content,
          },
        },
        {
          new: true,
        }
      );
      if (!updateParentReply) {
        throw new ApiErrorHandler(
          401,
          "Comment not updated. Unauthorized user or comment not found."
        );
      }
      return res
        .status(200)
        .json(
          new ApiResponce(
            200,
            updateParentReply,
            "Parent reply comment updated successfully"
          )
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
    throw new ApiErrorHandler(404, "Comment not found, Invalid comment Id");
  }
  if (!req.user?._id) {
    throw new ApiErrorHandler(401, "User not found, please login");
  }
  try {
    let deleteDocument;

    // Check if the contentId corresponds to a main comment or a reply
    const isMainComment = await Comment.exists({ _id: contentId });
    const isReply = await Reply.exists({ _id: contentId });

    if (isMainComment) {
      // Delete the main comment and its associated replies
      deleteDocument = await Comment.findOneAndDelete({
        _id: contentId,
        owner: req.user._id,
      });
      if (!deleteDocument) {
        throw new ApiErrorHandler(
          401,
          "Main comment does not exist or unauthorized user"
        );
      }
      // Remove likes associated with the deleted comment or reply
      await Like.deleteMany({ comment: contentId });
      // Fetch the data before Deleting from Reply
      const parentRepliesToDelete = await Reply.find({
        parentCommentId: contentId,
      });
      const parentreplyDeleteData = await Reply.deleteMany({
        parentCommentId: contentId,
      });
      if (parentreplyDeleteData.deletedCount > 0) {
        //console.log("parentRepliesToDelete: ", parentRepliesToDelete);
        const replyIdsToChildDelete = parentRepliesToDelete.map(
          (reply) => reply._id
        );
        // console.log("replyIdsToChildDelete from like: ", replyIdsToChildDelete);
        const childRepliesLikeToDelete = await Reply.find({
          parentReply: { $in: replyIdsToChildDelete },
        });
        const IsChildDelete = await Reply.deleteMany({
          parentReply: { $in: replyIdsToChildDelete },
        });
        await Like.deleteMany({ comment: { $in: replyIdsToChildDelete } });
        if (IsChildDelete.deletedCount > 0) {
          const replyIdsOfchildsToDeleteLike = childRepliesLikeToDelete.map(
            (reply) => reply._id
          );

          await Like.deleteMany({
            comment: { $in: replyIdsOfchildsToDeleteLike },
          });
        }
      }
    } else if (isReply) {
      // Delete the reply
      deleteDocument = await Reply.findOneAndDelete({
        _id: contentId,
        owner: req.user._id,
      });
      if (!deleteDocument) {
        throw new ApiErrorHandler(
          401,
          "Parent Reply does not exist or unauthorized user"
        );
      }
      // Delete associated likes for the reply
      await Like.deleteMany({ comment: contentId });
    } else {
      // If neither main comment nor reply is found, throw error
      throw new ApiErrorHandler(
        404,
        "Content not found while deleting comment.🙄"
      );
    }

    return res
      .status(200)
      .json(
        new ApiResponce(
          200,
          deleteDocument,
          "Comment or reply deleted successfully"
        )
      );
  } catch (error) {
    throw new ApiErrorHandler(
      error?.statusCode || 500,
      error?.message ||
        "Internal server error while deleting a comment or reply"
    );
  }
});

const mainCommentAndParentReplies = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { page = 1, limit = 5 } = req.query;
  if (!videoId || !mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiErrorHandler(404, "Invalid Video Id");
  }
  try {
    let pipeline = [];
    pipeline.push({
      $match: {
        video: new mongoose.Types.ObjectId(videoId),
      },
    });

    pipeline.push({ $sort: { createdAt: -1 } });

    pipeline.push(
      // Lookup owner details of the main comment
      {
        $lookup: {
          from: "users",
          localField: "owner",
          foreignField: "_id",
          as: "owner",
        },
      },
      {
        $unwind: {
          path: "$owner",
          preserveNullAndEmptyArrays: true,
        },
      },
      // Project fields of the main comment
      {
        $project: {
          content: 1,
          video: 1,
          owner: {
            _id: 1,
            fullName: 1,
            userName: 1,
            avatar: 1,
          },
          createdAt: 1,
          updatedAt: 1,
        },
      },
      // Lookup parent replies of the main comment
      {
        $lookup: {
          from: "replies",
          let: { commentId: "$_id" },
          pipeline: [
            // Match parent replies related to the comment
            {
              $match: {
                $expr: { $eq: ["$parentCommentId", "$$commentId"] },
              },
            },
            // Lookup owner details of the parent reply
            {
              $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
              },
            },
            {
              $unwind: {
                path: "$owner",
                preserveNullAndEmptyArrays: true,
              },
            },
            // Project fields of the parent reply
            {
              $project: {
                replyContent: 1,
                parentCommentId: 1,
                owner: {
                  _id: 1,
                  fullName: 1,
                  userName: 1,
                  avatar: 1,
                },
                createdAt: 1,
                updatedAt: 1,
              },
            },
          ],
          as: "parentReplies",
        },
      },
      // Unwind parentReplies array to flatten it
      {
        $unwind: {
          path: "$parentReplies",
          preserveNullAndEmptyArrays: true,
        },
      },
      // Group the results back by _id
      {
        $group: {
          _id: "$_id",
          content: { $first: "$content" },
          //video: { $first: "$video" },
          owner: { $first: "$owner" },
          createdAt: { $first: "$createdAt" },
          updatedAt: { $first: "$updatedAt" },
          parentReplies: { $push: "$parentReplies" }, // Use $push to gather all parent replies
        },
      }
    );
    //console.log(pipeline);
    const allComments = Comment.aggregate(pipeline); // do not use await for pagination
    //console.log("all comments", allComments);
    const result = await Comment.aggregatePaginate(allComments, {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    });
    if (!result) {
      throw new ApiErrorHandler(500, "error while fetching video's Comment");
    }

    return res
      .status(200)
      .json(new ApiResponce(200, result, "Comments fetched successfully"));
  } catch (error) {
    throw new ApiErrorHandler(
      error?.statusCode || 500,
      error?.message || "internal server error while fetching comments"
    );
  }
});

// reply of a comment
const addReply = asyncHandler(async (req, res) => {
  const { parentCommentId } = req.params;
  const { replyContent, parentReplyId } = req.body;
  const userId = req.user?._id;
  let pipeline = [];
  //const { parentReplyId = null } = req.params; // Capture parentReplyId if provided
  if (!replyContent || replyContent.length < 2 || replyContent.length > 255) {
    throw new ApiErrorHandler(
      404,
      "comment must be between 2 and 255 characters"
    );
  }
  if (!parentCommentId && !parentReplyId) {
    throw new ApiErrorHandler(
      404,
      "Either parentCommentId or parentReplyId must be provided."
    );
  }
  if (parentCommentId && !mongoose.Types.ObjectId.isValid(parentCommentId)) {
    console.log("parentCommentId: ", parentCommentId);
    throw new ApiErrorHandler(
      404,
      "Mian comment not found, Invalid Parent Comment Id."
    );
  }
  if (parentReplyId && !mongoose.Types.ObjectId.isValid(parentReplyId)) {
    throw new ApiErrorHandler(400, "Invalid parent reply ID provided.");
  }
  if (!req.user?._id) {
    throw new ApiErrorHandler(401, "user not found, please login");
  }
  try {
    let replyData = {
      replyContent,
      owner: userId,
    };
    if (parentReplyId) {
      replyData.parentReply = parentReplyId;
    } else {
      replyData.parentCommentId = parentCommentId;
    }

    const replyComment = await Reply.create(replyData);
    if (replyComment) {
      if (!parentReplyId) {
        await Comment.findByIdAndUpdate(parentCommentId, {
          $push: { replies: replyComment?._id },
        });
      }
    }

    if (!replyComment) {
      throw new ApiErrorHandler(
        404,
        "reply comment not added, please try again"
      );
    }
    pipeline = [
      {
        $match: {
          _id: replyComment._id,
          owner: replyComment.owner,
        },
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
        $unwind: {
          path: "$ownerDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          owner: {
            _id: "$ownerDetails._id",
            userName: "$ownerDetails.userName",
            fullName: "$ownerDetails.fullName",
            avatar: "$ownerDetails.avatar",
          },
        },
      },
      {
        $project: {
          ownerDetails: 0, // Exclude the ownerDetails subdocument
        },
      },
    ];

    const newReplyAndOwnerDetail = await Reply.aggregate(pipeline);

    if (!newReplyAndOwnerDetail) {
      throw new ApiErrorHandler(500, "Aggregation problem in new reply");
    }

    return res
      .status(200)
      .json(
        new ApiResponce(200, newReplyAndOwnerDetail, "Reply added successfully")
      );
  } catch (error) {
    throw new ApiErrorHandler(
      error?.statusCode || 500,
      error?.message || "internal server error while inserting a reply"
    );
  }
});

//////////////////////////////////////////////

async function fetchCommentsAndReplies(videoId, depthLimit) {
  if (depthLimit === 0) {
    return []; // Return an empty array if depth limit reached
  }

  try {
    const comments = await Comment.find({ video: videoId })
      .populate({
        path: "owner",
        select: "_id fullName userName avatar",
      })
      .lean(); // Convert documents to plain JavaScript objects

    if (!comments || comments.length === 0) {
      return []; // Return empty array if no comments found for the video
    }

    let allCommentsAndReplies = [];
    for (const comment of comments) {
      // Populate the replies field of each comment
      comment.replies = await populateReplies(comment.replies, depthLimit - 1);
      allCommentsAndReplies.push({ comment, replies: comment.replies });
    }
    //console.log("fetchCommentsAndParentReplies: "), allCommentsAndReplies;
    return allCommentsAndReplies;
  } catch (error) {
    throw new ApiErrorHandler(400, error?.message);
  }
}

async function populateReplies(replies, depthLimit) {
  if (depthLimit === 0 || !replies || replies.length === 0) {
    return []; // Return an empty array if depth limit reached or no replies
  }

  let allReplies = [];

  // Fetch both parent and nested replies
  const populatedReplies = await Reply.find({
    $or: [{ _id: { $in: replies } }, { parentReply: { $in: replies } }],
  })
    .populate({
      path: "owner",
      select: "_id fullName userName avatar",
    })
    .lean(); // Convert documents to plain JavaScript objects

  // Group replies by parentReply
  const parentRepliesMap = populatedReplies.reduce((map, reply) => {
    const parentId = reply.parentReply || reply._id;
    if (!map.has(parentId.toString())) {
      map.set(parentId.toString(), []);
    }
    map.get(parentId.toString()).push(reply);
    return map;
  }, new Map());

  // Fetch nested replies for each parent reply
  for (const reply of populatedReplies) {
    if (!reply.parentReply) {
      // This is a parent reply, fetch its nested replies
      const nestedReplies = await populateReplies([reply._id], depthLimit - 1);
      reply.nestedReplies = nestedReplies;
      allReplies.push(reply);
    }
  }

  // Combine parent replies with their nested replies
  for (const reply of allReplies) {
    const parentId = reply._id.toString();
    if (parentRepliesMap.has(parentId)) {
      reply.nestedReplies = parentRepliesMap.get(parentId);
    }
  }

  return allReplies;
}

// get main and parent Replies
// const mainCommentAndParentReplies = asyncHandler(async (req, res) => {
//   const { videoId } = req.params;
//   const { limit = 10, page = 1 } = req.query; // Pagination parameters

//   try {
//     const relatedCommentsPipeline = [
//       {
//         $match: { video: new mongoose.Types.ObjectId(videoId) },
//       },
//     ];

//     // Use the aggregation pipeline to fetch related comments
//     const relatedComments = Comment.aggregate(relatedCommentsPipeline);

//     const results = await Comment.aggregatePaginate(relatedComments, {
//       page: parseInt(page, 10),
//       limit: parseInt(limit, 10),
//     });
//     console.log("result: ", results);
//     // Now, populate the owner and replies fields of the comments
//     await Comment.populate(results.docs, {
//       path: "owner",
//       select: "_id fullName userName avatar",
//     });

//     for (const comment of results.docs) {
//       await Comment.populate(comment.replies, {
//         path: "owner",
//         select: "_id fullName userName avatar",
//       });
//     }

//     res.json(results); // Send the paginated comments with populated fields
//   } catch (error) {
//     console.log("error in mainCommentAndParentReplies: ", error);
//     throw new ApiErrorHandler(400, error?.message || "internal server error");
//   }
// });

// get nested replies of parent reply
const nestedRepliesOfPrentReply = asyncHandler(async (req, res) => {
  const { parentReplyId } = req.params;
  const { limit = 3 } = req.query; // Limit parameter

  try {
    // Function to recursively fetch nested replies with limit
    const fetchReplies = async (parentId, remainingLimit) => {
      if (remainingLimit <= 0) {
        return []; // Return empty array if limit reached
      }

      const replies = await Reply.find({ parentReply: parentId })
        .populate({
          path: "owner",
          select: "_id fullName userName avatar", // Populate the owner of the main comment
        })
        .lean();

      // Recursively fetch nested replies with decremented limit
      for (const reply of replies) {
        reply.nestedReplies = await fetchReplies(reply._id, remainingLimit - 1);
      }

      return replies;
    };

    // Start fetching replies recursively for the parent reply
    const allReplies = await fetchReplies(parentReplyId, limit);

    res.json(allReplies);
  } catch (error) {
    console.log("error in nestedRepliesOfPrentReply: ", error);
    throw new ApiErrorHandler(400, error?.message || "internal server error");
  }
});

export {
  addComment,
  editComment,
  deleteComment,
  //getAllComments,
  addReply,
  mainCommentAndParentReplies,
  nestedRepliesOfPrentReply,
};
