import { User } from "../models/user.model.js";
import { ApiErrorHandler } from "../utils/ApiErrorHandler.js";
import { ApiResponce } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const registerUser = asyncHandler(async (req, res) => {
  // 1: get the values from form
  const { userName, email, password, fullName } = req.body;
  //console.log("email: ", email);
  // 2: neccessary checks if null or empty
  // ---- here we check all fields are empty or not ? with some method of JS
  if (
    [userName, email, password, fullName].some((field) => field?.trim() === "")
  ) {
    // now when some return true, throw message to client
    throw new ApiErrorHandler(400, "All fields are required");
  } else if (!email.includes("@")) {
    throw new ApiErrorHandler(400, " @ is missing in email");
  }
  // 3: check user already exists ?

  // -- in mongoose model provide the us the direct contect with DB
  const userExist = User.findOne({
    // with $ sign it provide us the logical operator to query to mongo DB
    $or: [{ email }, { userName }],
  });
  if (userExist) {
    if (userExist.email === email) {
      throw new ApiErrorHandler(409, "Email already Exist!");
    } else if (userExist.userName === userName) {
      throw new ApiErrorHandler(409, "User Name is already exist!");
    }
  }
  // 4: (images will upload to cloudniary and get URL from cloudinary and check avatar again)

  // --- cus we inject our middleware multer in routes , so like req.body give us some
  // ---- function by express, so multer provide us req.files , access of all files from req objec
  const avatarLocalfilePath = req.files?.avatar[0]?.path;
  const coverImgLocalPath = req.files?.coverImage[0]?.path;
  if (!avatarLocalfilePath) {
    throw new ApiErrorHandler(400, "Avatar is mendatory!");
  }
  const cloudinaryAvatarUrl = await uploadOnCloudinary(avatarLocalfilePath);
  const cloudinaryCoverImgUrl = await uploadOnCloudinary(coverImgLocalPath);
  if (!cloudinaryAvatarUrl) {
    throw new ApiErrorHandler(500, "Avatar is not uploaded on Cloudinary");
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
  // check user is created ot not if yes than use select method to minus the password
  // in select methos - mean no need, for other property use " " (space) and write
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
  // 5: responce to client either success or faliure
  // 6: check user created or not ?
  // 7: when user create mnogo db send back all entries in responce , so remove pwd and refresh tokan
  // 8: res send to user
  // ---------------------------------------------- ///
  // just for testing of api on postman
  /*   res.status(200).json({
    message: "Hello world 😊",
  }); */
});

export { registerUser };
