import { Router } from "express";
import passport from "passport";
import axios from "axios";
import { User } from "../models/user.model.js";
import { ApiErrorHandler } from "../utils/ApiErrorHandler.js";
import { ApiResponce } from "../utils/ApiResponse.js";
import "dotenv/config";

const options = {
  httpOnly: true,
  secure: true,
};

const router = Router();

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

// authenticate the user from google

router.get(
  "/google/callback",
  (req, res, next) => {
    if (!req.session) {
      return res
        .status(500)
        .json({ error: "Session support is required for authentication." });
    }
    // req.session.isAuthenticated = true;
    next();
  },
  passport.authenticate("google", {
    successRedirect: process.env.CLIENT_URL,
    failureRedirect: `${process.env.CLIENT_URL}/login/failed`,
  }),
  (err, req, res, next) => {
    if (err) {
      console.error("Error in Google authentication callback:", err);
      return res.redirect(`${process.env.CLIENT_URL}/login/failed`);
    }
  }
);

// router.get(
//   "/google/callback",
//   (req, res, next) => {
//     if (!req.session) {
//       return res
//         .status(500)
//         .json({ error: "Session support is required for authentication." });
//     }
//     next();
//   },
//   (req, res, next) => {
//     passport.authenticate("google", async (err, user) => {
//       try {
//         if (err) {
//           console.error("Error in Google authentication callback:", err);
//           return res.status(500).json({ error: err?.message || err });
//         }
//         if (!user) {
//           // Handle the case where user is not returned
//           return res.status(401).json({ error: "User not found." });
//         }
//         // Here, you have access to the user data returned from Google strategy
//         //console.log("user Data: ", user);
//         const { accessToken, refreshToken } =
//           await generateAccessAndRefreshToken(user?._id);
//         // You can send this data back to the frontend
//         return res
//           .status(201)
//           .cookie("accessToken", accessToken, options)
//           .cookie("refreshToken", refreshToken, options)
//           .json({
//             user,
//             accessToken,
//             refreshToken,
//             message: "Login successfully.😊",
//           });
//       } catch (error) {
//         console.error("Error in Google authentication callback:", error);
//         throw new ApiErrorHandler(401, error?.message || "Error in authRouter");
//       }
//     })(req, res, next);
//   }
// );

// show the window of google authentication or fwd the request to google auth service
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// register or login user to DB
router.get("/login/success", async (req, res) => {
  if (req.user) {
    try {
      let userExist = await User.findOne({
        email: req?.user?._json.email,
      });
      if (userExist) {
        //console.log("user exist: ", userExist?._id);
        const { accessToken, refreshToken } =
          await generateAccessAndRefreshToken(userExist?._id);
        userExist.refreshToken = refreshToken;
        const loggedInUser = {
          _id: userExist._id,
          userName: userExist?.userName,
          email: userExist?.email,
          fullName: userExist?.fullName,
          avatar: userExist?.avatar,
          coverImage: userExist?.coverImage,
          watchHistory: userExist?.watchHistory,
          createdAt: userExist.createdAt,
          updatedAt: userExist.updatedAt,
        };
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
              },
              "Login successfully.😊"
            )
          );
      }
      let modifiedNewUserCreated;
      const newUser = await User.create({
        userName:
          req.user._json.family_name.toLowerCase() +
          " " +
          req?.user?._json.given_name.toLowerCase(),
        email: req?.user?._json.email,
        password: Date.now(), //dummy password
        fullName: req?.user?._json.name,
        avatar: req?.user?._json.picture,
        coverImage: "",
        avatarPublicId: "",
        coverImagePublicId: "",
      });
      if (newUser) {
        const { accessToken, refreshToken } =
          await generateAccessAndRefreshToken(newUser?._id);
        modifiedNewUserCreated = await User.findById(newUser?._id).select(
          "-password -refreshToken"
        );
        modifiedNewUserCreated.refreshToken = refreshToken;
        //modifiedNewUserCreated.accessToken = accessToken;
        return res
          .status(201)
          .cookie("accessToken", accessToken, options)
          .cookie("refreshToken", refreshToken, options)
          .json(
            new ApiResponce(
              200,
              {
                user: modifiedNewUserCreated,
                accessToken,
                refreshToken,
              },
              "Login successfullt.😊"
            )
          );
      } else {
        return res.status(404).json(new ApiResponce(404, {}, "user not found"));
      }
    } catch (error) {
      console.log("error in pasport.js: ", error);

      throw new ApiErrorHandler(
        500,
        error?.message || "internal server error at auth router"
      );
    }
  } else {
    res.status(400).json("error: user not foun");
  }
});

//login failed
router.get("/login/failed", (req, res) => {
  res.status(404).json(new ApiResponce(404, "login failed"));
});
export default router;
