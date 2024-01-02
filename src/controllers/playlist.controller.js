import { ApiErrorHandler } from "../utils/ApiErrorHandler.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponce } from "../utils/ApiResponse.js";
import { Playlist } from "../models/playlist.model.js";
import mongoose from "mongoose";

const createPlaylist = asyncHandler(async (req, res) => {
  // take name , desc from body
  // check null or empty
  // get user from req.user
  // check user exxist or not
  // create a playlist into mongodb within try catch

  const { name, description } = req.body;
  if (!name) {
    throw new ApiErrorHandler(400, "PlayList name is mendatory");
  }
  if (!req.user?._id) {
    throw new ApiErrorHandler(400, "user not found to create playlist");
  }
  try {
    // check playlist name already exist or not
    const PlaylistExist = await Playlist.findOne({
      owner: req.user._id,
      name,
    });
    if (PlaylistExist) {
      throw new ApiErrorHandler(
        404,
        "play list already exit. please choose another name"
      );
    }
    const newPlayList = await Playlist.create({
      name,
      description,
      owner: new mongoose.Types.ObjectId(req.user._id),
    });
    return res
      .status(200)
      .json(new ApiResponce(200, newPlayList, "Playlist created successfully"));
  } catch (error) {
    throw new ApiErrorHandler(
      error.statusCode || 500,
      error?.message || "internal server error while creating playlist"
    );
  }
});

const updatePlaylist = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  const { playlistId } = req.params;
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
    // check playlist ownership
    /*const existingPlaylist = await Playlist.findById(playlistId);
    if (!existingPlaylist) {
      throw new ApiErrorHandler(404, "play list not exit");
    }
    if (existingPlaylist.owner.toString() !== req.user?._id.toString()) {
      throw new ApiErrorHandler(
        403,
        "Unauthorized: User does not own this playlist"
      );
    }*/

    // Check if the new name is already used by another playlist
    const existingPlaylist = await Playlist.findOne({
      name: name,
      owner: req.user?._id,
      _id: { $ne: playlistId }, // ne: not equal, Exclude the current playlist being updated
    });

    if (existingPlaylist) {
      throw new ApiErrorHandler(400, "Playlist name already exists");
    }
    const playListObj = await Playlist.findOneAndUpdate(
      { _id: playlistId, owner: req.user?._id },
      {
        $set: {
          name,
          description,
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
  }
});

const addVideoIntoPlaylist = asyncHandler(async (req, res) => {});

const deletePlaylist = asyncHandler(async (req, res) => {});

const deleteVideoFromPlaylist = asyncHandler(async (req, res) => {});

export { createPlaylist, updatePlaylist };
