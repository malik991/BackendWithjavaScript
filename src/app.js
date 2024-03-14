import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
//import session from "express-session";

const app = express();

// allowed permission to fornt end, credential send credentials in header and allowed for us
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);

// allow json, and set limit of json, like data receive from forms
app.use(express.json({ limit: "16kb" }));
// get the data from URL. extended mean you can play with nested objects
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
// setup session middleware
// app.use(
//   session({
//     secret: process.env.MY_SECRET_KEY_SESSION || "hello kitti",
//     resave: false,
//     saveUninitialized: true,
//   })
// );

// to create public folder , where we can store different things statically and use their path directly
app.use(express.static("public"));

// crud operation on cookies scurly from just server side on the browser of client
app.use(cookieParser());

// all middlware will import first than get router
// router imports
import userRouter from "./routes/user.router.js";
import videoRouter from "./routes/video.router.js";
import playlistRouter from "./routes/playlist.router.js";
import commentRouter from "./routes/comment.router.js";
import likeRouter from "./routes/like.router.js";
import tweetRouter from "./routes/tweet.router.js";
import dashboardRouter from "./routes/dashboard.router.js";
import healthCheckRouter from "./routes/healthCheck.router.js";
import { ApiErrorHandler } from "./utils/ApiErrorHandler.js";

// routes declration , now we use middleware instead of app.get/post , coz we declrae our router separatly
app.use("/api/v1/users", userRouter);
app.use("/api/v1/videos", videoRouter);
app.use("/api/v1/playlist", playlistRouter);
app.use("/api/v1/comment", commentRouter);
app.use("/api/v1/like", likeRouter);
app.use("/api/v1/tweet", tweetRouter);
app.use("/api/v1/dashboard", dashboardRouter);
app.use("/api/v1/healthCheck", healthCheckRouter);

//http://localhost:8000/api/v1/users/register or login

// Error handler
app.use((err, req, res, next) => {
  // console.log("erro occured");
  if (err instanceof ApiErrorHandler) {
    //console.log("api errror handler object");
    err.sendJsonResponse(res); // Send JSON response using ApiErrorHandler method
  }
});

// just another way like default
export { app };
