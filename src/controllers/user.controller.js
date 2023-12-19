import { set } from "mongoose";
import { User } from "../models/user.model.js";
import { ApiErrorHandler } from "../utils/ApiErrorHandler.js";
import { ApiResponce } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
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
  // 1: get the values from form
  //console.log("req . body: ", req.body);
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
    //console.log(req.files);

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
  } finally {
    //console.log("finall run", avatarLocalfilePath, coverImgLocalPath);
    if (avatarLocalfilePath && fs.existsSync(avatarLocalfilePath)) {
      fs.unlinkSync(avatarLocalfilePath);
    }
    if (coverImgLocalPath && fs.existsSync(coverImgLocalPath)) {
      fs.unlinkSync(coverImgLocalPath);
    }
  }

  // ---------------------------------------------- ///
  // just for testing of api on postman
  /*   res.status(200).json({
    message: "Hello world ",
  }); */
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
      .json(new ApiResponce(401, null, "user name or email does not exit"));
  }
});

// check user
const checkUserProfile = asyncHandler(async (req, res) => {
  const userid = req.session.userId;
  const userName = req.session.username;
  if (userid) {
    return res.status(200).json(
      new ApiResponce(
        200,
        {
          userid,
          userName,
        },
        "huraah 😁"
      )
    );
  } else {
    return res.status(401).json(new ApiResponce(401, null, "hi hi hi"));
  }
});

const logoutUser = asyncHandler(async (req, res) => {
  if (req.user._id) {
    await User.findByIdAndUpdate(
      req.user._id,
      {
        // use mongo db operator, and del the refresh token
        $set: {
          refreshToken: undefined,
        },
      },
      {
        // in this way we get new updated value instead of old , so refresh token wil be undefined
        new: true,
      }
    );
    return res
      .status(200)
      .clearCookie("accessToken", options)
      .clearCookie("refreshToken", options)
      .json(new ApiResponce(201, {}, "Successfully logout😊"));
  } else {
    throw new ApiErrorHandler(401, "user not found in logout");
  }

  /*  req.session.destroy((err) => {
    if (err) {
      console.log("error in logout server: ", err);
      throw new ApiErrorHandler(500, "Error in server");
    }
    // clear the session cookie on client side
    res.clearCookie("connect.sid");
    return res
      .status(200)
      .json(new ApiResponce(200, null, "Logout Succesfully 😊"));
  }); */
});

const getRefreshAccessToken = asyncHandler(async (req, res) => {
  // get token from user to provide again him access
  const tokenReceiveFromUser = req.cookie.refreshToken || req.body.refreshToken;
  if (!tokenReceiveFromUser) {
    throw new ApiErrorHandler(401, "Invalid Token from user");
  }
  try {
    // verify user token from jwt
    const decodedToken = jwt.verify(
      tokenReceiveFromUser,
      process.env.REFRESH_TOKEN_SECRET
    );
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
      decodedToken?._id
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
export {
  registerUser,
  loginUser,
  checkUserProfile,
  logoutUser,
  getRefreshAccessToken,
};
