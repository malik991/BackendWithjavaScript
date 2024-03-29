import mongoose, { set } from "mongoose";
import { User } from "../models/user.model.js";
import { Video } from "../models/video.model.js";
import { ApiErrorHandler } from "../utils/ApiErrorHandler.js";
import { ApiResponce } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";
import fs from "fs";

// Global options for cookies
const options = {
  httpOnly: true,
  secure: true,
};

// access and refresh tokan into db
const generateAccessAndRefreshToken = async (userID) => {
  try {
    // access token provide to use while refresh token store in DB
    // to make easy for user do not enter password again and again while session expire
    const getUserById = await User.findById(userID);
    const accessToken = getUserById.generateAccessToken();
    const refreshToken = getUserById.generateRefreshToken();
    // insert into db refresh token
    getUserById.refreshToken = refreshToken;
    await getUserById.save({ validateBeforeSave: false }); // while save execute mendotry field will be kickin so prevent it.

    // now return both tokens
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiErrorHandler(
      500,
      "something went wrong while generate access and refresh token"
    );
  }
};

// register user
const registerUser = asyncHandler(async (req, res) => {
  let avatarLocalfilePath;
  let coverImgLocalPath;
  try {
    const { userName, email, password, fullName } = req.body;

    if (
      req.files &&
      Array.isArray(req.files.coverImage) &&
      req.files.coverImage.length > 0
    ) {
      coverImgLocalPath = req.files.coverImage[0].path;
    }
    if (
      req.files &&
      Array.isArray(req.files.avatar) &&
      req.files.avatar.length > 0
    ) {
      avatarLocalfilePath = req.files.avatar[0].path;
    }
    //const coverImgLocalPath = req.files?.coverImage[0]?.path; JS issue
    if (!avatarLocalfilePath) {
      throw new ApiErrorHandler(400, "Avatar is mendatory!");
    }
    //console.log(avatarLocalfilePath, coverImgLocalPath);
    // 2: neccessary checks if null or empty
    // ---- here we check all fields are empty or not ? with some method of JS
    if (
      [userName, email, password, fullName].some(
        (field) => field?.trim() === ""
      )
    ) {
      // now when some return true, throw message to client
      throw new ApiErrorHandler(400, "All fields are required");
    } else if (email) {
      if (!email.includes("@")) {
        throw new ApiErrorHandler(400, " @ is missing in email");
      }
    }
    // 3: check user already exists ?

    // -- in mongoose model provide the us the direct contect with DB
    const userExist = await User.findOne({
      // with $ sign it provide us the logical operator to query to mongo DB
      $or: [{ email }, { userName }],
    });
    if (
      userExist &&
      (userExist.email === email.toLowerCase() ||
        userExist.userName === userName.toLowerCase())
    ) {
      //console.log(`DB ${userExist.userName} and postman: ${userName}`);
      if (userExist.email === email.toLowerCase()) {
        throw new ApiErrorHandler(409, "Email already Exist!");
      }
      if (userExist.userName === userName.toLowerCase()) {
        throw new ApiErrorHandler(
          409,
          "User Name is already exist Do not use Uppercase Letter!"
        );
      }
    }
    // 4: (images will upload to cloudniary and get URL from cloudinary and check avatar again)

    // --- cus we inject our middleware multer in routes , so like req.body give us some
    // ---- function by express, so multer provide us req.files , access of all files from req objec

    const cloudinaryAvatarUrl = await uploadOnCloudinary(avatarLocalfilePath);
    const cloudinaryCoverImgUrl = await uploadOnCloudinary(coverImgLocalPath);
    if (!cloudinaryAvatarUrl) {
      throw new ApiErrorHandler(
        500,
        "Avatar is not uploaded on Cloudinary, Try again plz."
      );
    }
    //------------------------------------------------------------------- ///

    // 5: create object for send data to DB in mongo
    const newUser = await User.create({
      userName: userName.toLowerCase(),
      email,
      password,
      fullName,
      avatar: cloudinaryAvatarUrl.url,
      coverImage: cloudinaryCoverImgUrl?.url || "", // check for cover image
      avatarPublicId: cloudinaryAvatarUrl?.public_id || "",
      coverImagePublicId: cloudinaryCoverImgUrl?.public_id || "",
    });

    //  when user create mnogo db send back all entries in responce , so remove pwd and refresh tokan
    // check user is created or not if yes than use select method to minus the password
    // in select methods -(-ve) mean no need, for other property use " " (space) and write
    const checkUserCreated = await User.findById(newUser._id).select(
      "-password -refreshToken"
    );
    if (!checkUserCreated) {
      throw new ApiErrorHandler(
        500,
        "some thing went wrong while register the User!"
      );
    }
    // if uer ceeated send the responce, but by well strcutred responce
    return res
      .status(201)
      .json(
        new ApiResponce(200, checkUserCreated, "user created Successfully.😊")
      );
  } catch (error) {
    console.log("Error in register user", error);
    throw new ApiErrorHandler(500, error?.message);
  }
});

// login user

const loginUser = asyncHandler(async (req, res) => {
  const { emailOrUserName, password } = req.body;
  if ([emailOrUserName, password].some((field) => field?.trim() === "")) {
    throw new ApiErrorHandler(400, "All fields are required");
  }

  // check user exist
  const userExist = await User.findOne({
    $or: [
      { email: emailOrUserName.toLowerCase() },
      { userName: emailOrUserName.toLowerCase() },
    ],
  });
  //console.log(userExist);
  if (userExist) {
    const isPasswordOk = await userExist.isPasswordCorrect(password);
    if (isPasswordOk) {
      // req.session.userId = userExist._id;
      // req.session.username = userExist.userName

      // call token method
      const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
        userExist._id
      );
      // now update the userExist obj with refresh token
      userExist.refreshToken = refreshToken; // instead of calling DB.

      // fields which do not send to the user(-password and refershtoken)
      const loggedInUser = {
        _id: userExist._id,
        userName: userExist.userName,
        email: userExist.email,
        fullName: userExist.fullName,
        avatar: userExist.avatar,
        coverImage: userExist.coverImage,
        watchHistory: userExist.watchHistory,
        createdAt: userExist.createdAt,
        updatedAt: userExist.updatedAt,
      };

      // now send these tokens into cookies, design an object for cookies
      // to make cookie secure, now just server side modify the cookies

      return res
        .status(201)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
          new ApiResponce(
            200,
            {
              user: loggedInUser,
              accessToken,
              refreshToken,
              ////////////////////////////////////
              // userId: userExist._id,
              // username: userExist.userName,
              // FullName: userExist.fullName,
            },
            "Login successfullt.😊"
          )
        );
    } else {
      return res
        .status(401)
        .json(
          new ApiResponce(
            401,
            null,
            `Hello ${req.body.emailOrUserName}: your password not correct.🙄`
          )
        );
    }
  } else {
    return res
      .status(401)
      .json(new ApiResponce(401, [], "user name or email does not exit"));
  }
});

const logoutUser = asyncHandler(async (req, res) => {
  if (req.user?._id) {
    await User.findByIdAndUpdate(
      req.user._id,
      {
        $unset: {
          refreshToken: 1,
        },
      },
      {
        new: true,
      }
    );

    // Clear JWT tokens from client-side storage if needed
    // Example: localStorage.removeItem('accessToken');
    // Logout the user using Passport.js

    if (req.session) {
      req.session.destroy((err) => {
        if (err) {
          console.error("Error destroying session:", err);
          throw new ApiErrorHandler(500, "error while logout");
        }

        // Even if there's an error destroying the session, clear cookies
        res.clearCookie("connect.sid", options); // Clear the session cookie
        res.clearCookie("accessToken", options);
        res.clearCookie("refreshToken", options);
        //req.logout();
        // res.redirect(CLIENT_URL);
        res.status(200).json(new ApiResponce(201, {}, "Successfully logout😊"));
      });
    } else {
      // If session doesn't exist, clear cookies and send response
      res.clearCookie("accessToken", options);
      res.clearCookie("refreshToken", options);
      res.status(200).json(new ApiResponce(201, {}, "Successfully logout😊"));
    }
  } else {
    throw new ApiErrorHandler(401, "User not found during logout");
  }
});

const getRefreshAccessToken = asyncHandler(async (req, res) => {
  // get token from user to provide again him access
  //console.log("cookie: ", req.cookies);
  const tokenReceiveFromUser =
    req.cookies.refreshToken || req.body.refreshToken;
  //console.log("get refresh: ", tokenReceiveFromUser);
  if (!tokenReceiveFromUser) {
    throw new ApiErrorHandler(401, "Invalid Token from user");
  }
  try {
    // verify user token from jwt
    const decodedToken = jwt.verify(
      tokenReceiveFromUser,
      process.env.REFRESH_TOKEN_SECRET
    );
    //console.log("decode: ", decodedToken);
    // now we hv raw token, match with refresh token store in DB
    const userAndRefreshTokenDb = await User.findById(decodedToken?._id);
    if (!userAndRefreshTokenDb) {
      throw new ApiErrorHandler(401, "Invalid refresh token ");
    }
    if (tokenReceiveFromUser !== userAndRefreshTokenDb?.refreshToken) {
      throw new ApiErrorHandler(401, "refresh token is expired or used");
    }
    // otherwise , generate a new token for user
    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
      userAndRefreshTokenDb?._id
    );

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
        new ApiResponce(
          201,
          { accessToken, refreshToken },
          "access token refreshed!😎"
        )
      );
  } catch (error) {
    throw new ApiErrorHandler(401, error?.message || "Refresh Token failed");
  }
});

// update password endpoint
const updatePassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!(oldPassword || newPassword)) {
    throw new ApiErrorHandler(401, "Old and New Password are required");
  }
  try {
    const user = await User.findById(req.user?._id);
    const isPasswordOk = await user.isPasswordCorrect(oldPassword);
    if (!isPasswordOk) {
      throw new ApiErrorHandler(401, "Old password is incorrect");
    }
    user.password = newPassword;
    await user.save({ validateBeforeSave: false });
    res.status(200).json(new ApiResponce(200, {}, "Password Updated 😊"));
  } catch (error) {
    throw new ApiErrorHandler(
      401,
      error?.message || "Error while update password"
    );
  }
});

// get currentUser endpoint
const getCurrentUser = asyncHandler(async (req, res) => {
  const fetchUser = req?.user;
  if (!fetchUser) {
    throw new ApiErrorHandler(401, "user not exist or logged in");
  }
  return res
    .status(200)
    .json(new ApiResponce(200, req.user, "Fetched user successfully 😊"));
});

// update user infos
const updateAccountDetails = asyncHandler(async (req, res) => {
  const { userName, email, fullName } = req.body;
  const userId = req.user?._id;
  if (!(userName && email && fullName)) {
    throw new ApiErrorHandler(401, "All fields are required");
  }

  if (!userId) {
    throw new ApiErrorHandler(404, "user not found");
  }
  try {
    //console.log("userName: ", userName);
    const user = await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          userName,
          email,
          fullName,
        },
      },
      { new: true }
    ).select("-password");
    return res
      .status(200)
      .json(new ApiResponce(201, user, "Details updated successfully 😊"));
  } catch (error) {
    throw new ApiErrorHandler(
      401,
      error?.message || "Error while user details update"
    );
  }
});

const updateAvatar = asyncHandler(async (req, res) => {
  if (!req.file || Object.keys(req.file).length === 0) {
    throw new ApiErrorHandler(401, "please upload the avatar");
  }
  //const localAvatarPath = req.file?.avatar[0].path; // file comes from multer in routes file
  const localAvatarPath = req.file?.path;
  //console.log("local path: ", localAvatarPath);
  const userId = req.user?._id;

  if (!localAvatarPath) {
    throw new ApiErrorHandler(401, "avatar file is missing");
  }
  if (!userId) {
    throw new ApiErrorHandler(401, "invalid request for avatar update");
  }
  // get user data from db
  // delete old avatar
  const result = await User.findById(userId);
  if (!result || result.length === 0) {
    throw new ApiErrorHandler(404, "user not found");
  }
  const { deleteImageResponse } = await deleteFromCloudinary([
    result.avatarPublicId,
  ]);
  if (!deleteImageResponse) {
    throw new ApiErrorHandler(
      "500",
      "Problem while delteing avatar from cloudinary, please try again"
    );
  }
  //console.log("thumbNial deletion response: ", deleteImageResponse);
  const cloudinaryObj = await uploadOnCloudinary(localAvatarPath);
  if (!cloudinaryObj.url) {
    throw new ApiErrorHandler(400, "Error while uploading avatar!");
  }
  if (localAvatarPath && fs.existsSync(localAvatarPath)) {
    fs.unlinkSync(localAvatarPath);
  }
  const user = await User.findByIdAndUpdate(
    userId,
    {
      $set: {
        avatar: cloudinaryObj.url,
        avatarPublicId: cloudinaryObj.public_id,
      },
    },
    {
      new: true,
    }
  ).select("-password");
  return res
    .status(200)
    .json(new ApiResponce(201, user, "Avatar image successfully updated 😊"));
});

// cover image
const updateCoverImage = asyncHandler(async (req, res) => {
  try {
    if (!req.file || Object.keys(req.file).length === 0) {
      throw new ApiErrorHandler(401, "please select the cover image");
    }
    const localCoverImagePath = req.file?.path; // file comes from multer in routes file
    const userId = req.user?._id;
    if (!userId) {
      throw new ApiErrorHandler(401, "invalid request for accounts update");
    }
    if (!localCoverImagePath) {
      throw new ApiErrorHandler(401, "CoverImage file is missing");
    }
    const result = await User.findById(userId);
    if (!result || result.length === 0) {
      throw new ApiErrorHandler(
        404,
        "user not exist while updating cover image."
      );
    }
    const { deleteImageResponse } = await deleteFromCloudinary([
      result.coverImagePublicId,
    ]);
    if (!deleteImageResponse) {
      throw new ApiErrorHandler(
        "500",
        "Problem while deleteing cover from cloudinary, please try again"
      );
    }
    const cloudinaryObj = await uploadOnCloudinary(localCoverImagePath);
    if (!cloudinaryObj.url) {
      throw new ApiErrorHandler(400, "Error while uploading CoverImage!");
    }
    if (localCoverImagePath && fs.existsSync(localCoverImagePath)) {
      console.log("enter in local path");
      fs.unlinkSync(localCoverImagePath);
    }
    const user = await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          coverImage: cloudinaryObj.url,
          coverImagePublicId: cloudinaryObj.public_id,
        },
      },
      {
        new: true,
      }
    ).select("-password");
    return res
      .status(200)
      .json(new ApiResponce(201, user, "Cover image successfully updated 😊"));
  } catch (error) {
    console.log("Error in updatecoverImage endPoint", error);
    // Forward the error to the global error handler
    throw new ApiErrorHandler(
      error.statusCode || 500,
      error.message || "Internal server error"
    );
  }
});

const getChannelProfile = asyncHandler(async (req, res) => {
  try {
    //console.log("req cookie", req.cookies);
    let user = null;
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer", "");
    // get the verification from jwt and pass secret key for decoded info
    if (token) {
      const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
      // use decoded info and hit the DB query
      user = await User.findById(decodedToken?._id).select(
        "-password -refreshToken"
      );
    }

    // now add a new obj in req
    req.user = user;
    //console.log("req user: ", req.user);
  } catch (error) {
    throw new ApiErrorHandler(401, error?.message || "Invalid Access Token");
  }
  // get the channel name or user from URL
  const { username } = req.params;
  if (!username?.trim()) {
    throw new ApiErrorHandler(404, "username in url does not exist");
  }
  // here we use aggregate to match the channel privded by username from user
  const channel = await User.aggregate([
    {
      $match: {
        userName: username?.toLowerCase(),
      },
    },
    {
      // get the total subscribers
      $lookup: {
        from: "subscriptions", // coz in DB model name is small and plural
        localField: "_id", // from user's collection
        foreignField: "channel", // by channel we get the total docs or subscriber
        as: "subscribers",
      },
    },
    {
      // Find out subscribed To
      $lookup: {
        from: "subscriptions", // coz in DB model name is small and plural
        localField: "_id",
        foreignField: "subscriber", // by subscriber we get the this channel subscribed To
        as: "subscribedTo",
      },
    },
    {
      // now we will count the subscribers
      $addFields: {
        SubscriberCount: {
          // $size use for count the total documents
          $size: "$subscribers", // here $subscribers is a field which use above "as"
        },
        channelSubscribedToCount: {
          $size: "$subscribedTo",
        },
        isSubscriber: {
          // here we check logged in user is subscriber or not in if condition aggregate
          // then use for true and else for false
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] }, // if you are already logged in, there will be a user with _id, and look into $subscribers.subscriber
            then: true,
            else: false,
          },
        },
      },
    },
    {
      // now use $project, which projection the data which we need to send to the frontEnd
      $project: {
        fullName: 1,
        userName: 1,
        SubscriberCount: 1,
        channelSubscribedToCount: 1,
        isSubscriber: 1,
        avatar: 1,
        coverImage: 1,
        email: 1,
        createdAt: 1,
      },
    },
  ]);

  const channelUserId = channel[0]?._id;
  if (!channelUserId) {
    throw new ApiErrorHandler(404, "Channel UserId is not authorized or login");
  }
  // get total video from video
  const totalVideos = await Video.aggregate([
    {
      $match: {
        owner: channelUserId,
        isPublished: true,
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: 1 }, // Count the documents
        totalViews: { $sum: "$views" },
      },
    },
  ]);
  const totalVideoCount = totalVideos.length > 0 ? totalVideos[0].total : 0;
  const totalViewsCount =
    totalVideos.length > 0 ? totalVideos[0].totalViews : 0;
  channel[0].totalVideos = totalVideoCount;
  channel[0].totalViews = totalViewsCount;
  if (!channel?.length) {
    throw new ApiErrorHandler(404, "channel does not exists");
  }
  // now return the 0th value of channel just an object of an array
  return res
    .status(200)
    .json(new ApiResponce(200, channel[0], "channel fetched successfully 😊"));
});

// get watch hostory
const getWatchHistory = asyncHandler(async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const user = await User.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(req.user?._id),
        },
      },
      {
        $lookup: {
          from: "videos",
          localField: "watchHistory",
          foreignField: "_id",
          as: "watchHistory",
          pipeline: [
            {
              $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                  {
                    $project: {
                      fullName: 1,
                      userName: 1,
                      avatar: 1,
                    },
                  },
                ],
              },
            },
            {
              $addFields: {
                owner: { $first: "$owner" },
              },
            },
          ],
        },
      },
      {
        $project: {
          watchHistoryCount: { $size: "$watchHistory" },
          docs: {
            $slice: ["$watchHistory", (page - 1) * limit, limit],
          },
        },
      },
    ]);

    if (!user || user.length === 0) {
      throw new ApiErrorHandler(404, "User or watch history not found");
    }

    const { docs, watchHistoryCount } = user[0];

    const totalPages = Math.ceil(watchHistoryCount / limit);

    return res.status(200).json(
      new ApiResponce(
        200,
        {
          docs,
          totalDocs: watchHistoryCount,
          totalPages,
          currentPage: parseInt(page),
        },
        "watch history successully fetched"
      )
    );
  } catch (error) {
    console.error("Error in get watch history: ", error);
    throw new ApiErrorHandler(
      error.statusCode || 500,
      error.message || "Internal server error"
    );
  }
});

// add to watchhistory
const addToWatchHistory = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!req.user?._id) {
    throw new ApiErrorHandler("400", "Invalid User Id");
  }
  if (!videoId || !mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiErrorHandler(404, "Invalid video Id.");
  }
  try {
    const user = await User.findByIdAndUpdate(
      req.user?._id,
      {
        $addToSet: {
          // $addToSet added videoIds ensure no duplication occurence :)
          watchHistory: videoId,
        },
      },
      { new: true }
    ).select("-password");
    if (!user) {
      throw new ApiErrorHandler(404, "watch history user's not added");
    }
    return res
      .status(200)
      .json(new ApiResponce(200, user, "Video added to watch history"));
  } catch (error) {
    throw new ApiErrorHandler(
      error?.statusCode || 500,
      error?.message ||
        "internal server error while tracking user's watch history"
    );
  }
});

export {
  registerUser,
  loginUser,
  logoutUser,
  getRefreshAccessToken,
  updatePassword,
  getCurrentUser,
  updateAccountDetails,
  updateAvatar,
  updateCoverImage,
  getChannelProfile,
  getWatchHistory,
  addToWatchHistory,
};
