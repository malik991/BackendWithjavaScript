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
      throw new ApiErrorHandler(404, "video already exist");
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
  try {
    const getPlaylists = await Playlist.find({ owner: req.user?._id });
    if (!getPlaylists || getPlaylists.length === 0) {
      return res
        .status(200)
        .json(new ApiResponce(200, {}, "playlist not found, please create"));
    }
    return res
      .status(200)
      .json(
        new ApiResponce(200, getPlaylists, "Playlists retrieved successfully")
      );
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

export {
  createPlaylist,
  updatePlaylist,
  addVideoIntoPlaylist,
  checkUserPlaylists,
  deletePlaylist,
  deleteVideoFromPlaylist,
};
