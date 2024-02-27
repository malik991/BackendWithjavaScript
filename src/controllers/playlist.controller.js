import { ApiErrorHandler } from "../utils/ApiErrorHandler.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponce } from "../utils/ApiResponse.js";
import { Playlist } from "../models/playlist.model.js";
import mongoose from "mongoose";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinary.js";
import fs from "fs";

const createPlaylist = asyncHandler(async (req, res) => {
  let localcoverImagePath;
  const { name, description, isPublished } = req.body;
  if (!name) {
    throw new ApiErrorHandler(400, "PlayList name is mendatory");
  }
  if (!req.user?._id) {
    throw new ApiErrorHandler(400, "user not found to create playlist");
  }

  try {
    localcoverImagePath = req.file?.path;
    // check playlist name already exist or not
    const PlaylistExist = await Playlist.findOne({
      owner: req.user._id,
      name,
    });
    if (PlaylistExist) {
      //console.log("Error object type:", typeof error);
      throw new ApiErrorHandler(
        404,
        "play list already exit. please choose another name"
      );
    }
    const cloudinarycoverImageUrl =
      localcoverImagePath && (await uploadOnCloudinary(localcoverImagePath));
    if (localcoverImagePath && !cloudinarycoverImageUrl) {
      throw new ApiErrorHandler(
        500,
        "Error while uploading the cover image of playlist on cloudinary, please try again"
      );
    }
    //console.log("cloudniary url: ", cloudinarycoverImageUrl);
    //console.log("all parameters: ", name, description, isPublished);
    //const coverImagePublicId = cloudinarycoverImageUrl?.public_id;
    const newPlayList = await Playlist.create({
      name,
      description,
      owner: new mongoose.Types.ObjectId(req.user._id),
      coverImage: cloudinarycoverImageUrl?.url || "",
      coverImagePublicId: cloudinarycoverImageUrl?.public_id || "",
      isPublished,
    });
    return res
      .status(200)
      .json(new ApiResponce(200, newPlayList, "Playlist created successfully"));
  } catch (error) {
    throw new ApiErrorHandler(
      error.statusCode || 500,
      error?.message || "internal server error while creating playlist"
    );
  } finally {
    if (localcoverImagePath) {
      //console.log("enter in finally if condition");
      fs.unlinkSync(localcoverImagePath);
    }
  }
});

const updatePlaylist = asyncHandler(async (req, res) => {
  const { name, description, isPublished } = req.body;
  const { playlistId } = req.params;
  let localcoverImagePath;
  if (!name) {
    throw new ApiErrorHandler(400, "PlayList name is mendatory");
  }
  if (!playlistId || !mongoose.Types.ObjectId.isValid(playlistId)) {
    throw new ApiErrorHandler(404, "play list not exist or id is incorrect ");
  }
  if (!req.user?._id) {
    throw new ApiErrorHandler(400, "user not found to update playlist");
  }
  try {
    localcoverImagePath = req.file?.path;
    //console.log("local image: ", localcoverImagePath);

    // Check if the new name is already used by another playlist
    const existingPlaylistQuery = {
      name: name,
      owner: req.user?._id,
      _id: { $ne: playlistId }, // Exclude the current playlist being updated
    };

    const resultQuery = {
      _id: playlistId,
      owner: req.user?._id,
    };

    const [existingPlaylist, result] = await Promise.all([
      Playlist.findOne(existingPlaylistQuery),
      Playlist.findOne(resultQuery),
    ]);
    if (existingPlaylist) {
      throw new ApiErrorHandler(400, "Playlist name already exist 🙄");
    }

    if (localcoverImagePath) {
      const { deleteImageResponse } = await deleteFromCloudinary([
        result.coverImagePublicId,
      ]);
      if (!deleteImageResponse) {
        throw new ApiErrorHandler(
          "500",
          "Problem while delteing file from cloudinary, please try again"
        );
      }
    }

    const cloudinarycoverImageUrl =
      localcoverImagePath && (await uploadOnCloudinary(localcoverImagePath));
    if (localcoverImagePath && !cloudinarycoverImageUrl) {
      throw new ApiErrorHandler(
        500,
        "Error while update the cover image of playlist on cloudinary, please try again"
      );
    }

    const playListObj = await Playlist.findOneAndUpdate(
      { _id: playlistId, owner: req.user?._id },
      {
        $set: {
          name,
          description,
          isPublished,
          // Conditionally set coverImage and coverImagePublicId based on cloudinarycoverImageUrl
          ...(cloudinarycoverImageUrl && {
            coverImage: cloudinarycoverImageUrl.url,
            coverImagePublicId: cloudinarycoverImageUrl.public_id,
          }),
        },
      },
      { new: true }
    );
    if (!playListObj) {
      throw new ApiErrorHandler(
        404,
        "playlist not found or unauthorized user "
      );
    }

    return res
      .status(200)
      .json(new ApiResponce(200, playListObj, "Playlist updated successfully"));
  } catch (error) {
    throw new ApiErrorHandler(
      error.statusCode || 500,
      error?.message || "internal server error while updating playlist"
    );
  } finally {
    if (localcoverImagePath && fs.existsSync(localcoverImagePath)) {
      console.log("enter in finally");
      fs.unlinkSync(localcoverImagePath);
    }
  }
});

const addVideoIntoPlaylist = asyncHandler(async (req, res) => {
  //videoid and playlistid fromparams
  //check video id correct or null
  // req.user check\
  // check video id already exist in this playlist and into loggedin user context
  // insert into videos array

  const { videoId, playlistId } = req.params;
  //const decodedVideoId = decodeURIComponent(videoId);
  //console.log("Video ID:", videoId);
  //console.log("Playlist ID:", playlistId);
  if (!videoId || !mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiErrorHandler(404, "video Id not exist");
  }
  if (!playlistId || !mongoose.Types.ObjectId.isValid(playlistId)) {
    throw new ApiErrorHandler(404, "Playlist Id not valid");
  }
  if (!req.user?._id) {
    throw new ApiErrorHandler("400", "user not exist, please login again");
  }
  try {
    const checkVideoExist = await Playlist.findOne({
      _id: playlistId,
      owner: req.user?._id,
      videos: { $in: [videoId] },
    });
    if (checkVideoExist) {
      throw new ApiErrorHandler(404, "video already exist in your play list");
    }
    const updatePlayList = await Playlist.findOneAndUpdate(
      {
        _id: playlistId,
        owner: req.user?._id,
      },
      {
        $addToSet: { videos: videoId },
      },
      {
        new: true,
      }
    );
    if (!updatePlayList) {
      throw new ApiErrorHandler(
        404,
        "video not added into this playlist, try again"
      );
    }
    return res
      .status(200)
      .json(new ApiResponce(200, updatePlayList, "video added successfully"));
  } catch (error) {
    throw new ApiErrorHandler(
      error?.statusCode || 500,
      error?.message || "internal server error while adding video into playlisy"
    );
  }
});

const checkUserPlaylists = asyncHandler(async (req, res) => {
  if (!req.user?._id) {
    throw new ApiErrorHandler(400, "user not exist, please login");
  }
  let pipeline = [];
  try {
    const { page = 1, limit = 3, query, sortBy, sortType } = req.query;
    pipeline.push(
      {
        $match: {
          owner: new mongoose.Types.ObjectId(req.user?._id),
        },
      },
      {
        $sort: { createdAt: -1 },
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
            fullName: "$ownerDetails.fullName",
            avatar: "$ownerDetails.avatar",
            userName: "$ownerDetails.userName",
          },
        },
      },
      {
        $lookup: {
          from: "videos",
          localField: "videos",
          foreignField: "_id",
          as: "videoDetails",
        },
      },
      {
        $addFields: {
          videos: {
            $map: {
              input: "$videos",
              as: "videoId",
              in: {
                $let: {
                  vars: {
                    videoDoc: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: "$videoDetails",
                            cond: { $eq: ["$$this._id", "$$videoId"] },
                          },
                        },
                        0,
                      ],
                    },
                  },
                  in: {
                    _id: "$$videoDoc._id",
                    title: "$$videoDoc.title",
                    description: "$$videoDoc.description",
                    duration: "$$videoDoc.duration",
                    views: "$$videoDoc.views",
                    videoFile: "$$videoDoc.videoFile",
                    thumbNail: "$$videoDoc.thumbNail",
                    // Add other selected fields from the videos object here
                  },
                },
              },
            },
          },
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          description: 1,
          coverImage: 1,
          isPublished: 1,
          owner: 1,
          videos: 1,
        },
      }
    );
    //const getPlaylists = await Playlist.find({ owner: req.user?._id });
    const getPlaylistsAggregate = Playlist.aggregate(pipeline);
    const result = await Playlist.aggregatePaginate(getPlaylistsAggregate, {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    });
    if (!result) {
      throw new ApiErrorHandler(
        500,
        "error while fetching playlists of logged in user"
      );
    }
    // if (!getPlaylists || getPlaylists.length === 0) {
    //   return res
    //     .status(200)
    //     .json(new ApiResponce(200, {}, "playlist not found, please create"));
    // }
    return res
      .status(200)
      .json(new ApiResponce(200, result, "Playlists retrieved successfully"));
  } catch (error) {
    throw new ApiErrorHandler(
      error?.statusCode || 500,
      error?.message ||
        "internal server error while checking the users playlists"
    );
  }
});

const deletePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  if (!playlistId || !mongoose.Types.ObjectId.isValid(playlistId)) {
    throw new ApiErrorHandler(404, "playlist Id not correct or not exist");
  }
  if (!req.user?._id) {
    throw new ApiErrorHandler(400, "user not exist, please login again");
  }
  try {
    const playlistExist = await Playlist.findOneAndDelete(
      {
        _id: playlistId,
        owner: req.user?._id,
      },
      { new: true }
    );

    if (!playlistExist) {
      throw new ApiErrorHandler(400, "playlist not exist or Unauthorized user");
    }
    if (playlistExist.coverImagePublicId) {
      const { deleteImageResponse } = await deleteFromCloudinary([
        playlistExist.coverImagePublicId,
      ]);
      if (!deleteImageResponse) {
        throw new ApiErrorHandler(
          "500",
          "Eror while delteing covernImage from cloudinary, please try again"
        );
      }
    }

    return res
      .status(200)
      .json(new ApiResponce(200, null, "Playlist deleted successfully "));
  } catch (error) {
    throw new ApiErrorHandler(
      error?.statusCode || 500,
      error?.message || "internal server error while deleting the playlist"
    );
  }
});

const deleteVideoFromPlaylist = asyncHandler(async (req, res) => {
  const { videoId, playlistId } = req.params;
  if (!playlistId || !mongoose.Types.ObjectId.isValid(playlistId)) {
    throw new ApiErrorHandler(404, "playlist Id not correct or not exist");
  }
  if (!videoId || !mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiErrorHandler(404, "video Id not correct or not exist");
  }
  if (!req.user?._id) {
    throw new ApiErrorHandler(400, "user not exist, please login again");
  }
  try {
    const deletedVideoPlaylist = await Playlist.findOneAndUpdate(
      {
        _id: playlistId,
        videos: videoId,
        owner: req.user?._id,
      },
      {
        $pull: {
          videos: videoId,
        },
      },
      { new: true }
    );
    if (!deletedVideoPlaylist) {
      throw new ApiErrorHandler(401, "video not exist or Unauthorized user");
    }
    return res
      .status(200)
      .json(
        new ApiResponce(
          200,
          deletedVideoPlaylist,
          "Video deleted from playlist successfully"
        )
      );
  } catch (error) {
    throw new ApiErrorHandler(
      error?.statusCode || 500,
      error?.message || "internal server error while deleting the playlist"
    );
  }
});

//getPlaylistById
const getPlaylistById = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  if (!playlistId || !mongoose.Types.ObjectId.isValid(playlistId)) {
    throw new ApiErrorHandler(404, "Invalid play list Id");
  }
  try {
    const getPlaylist = await Playlist.findById(playlistId);
    if (!getPlaylist) {
      throw new ApiErrorHandler(404, "play list not available");
    }
    return res
      .status(200)
      .json(new ApiResponce(200, getPlaylist, "playlist fetched successfully"));
  } catch (error) {
    throw new ApiErrorHandler(
      error?.statusCode || 500,
      error?.message ||
        "internal server error while fetching the playlist by Id"
    );
  }
});

export {
  createPlaylist,
  updatePlaylist,
  addVideoIntoPlaylist,
  checkUserPlaylists,
  deletePlaylist,
  deleteVideoFromPlaylist,
  getPlaylistById,
};
