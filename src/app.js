import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

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

// to create public folder , where we can store different things statically and use their path directly
app.use(express.static("public"));

// crud operation on cookies scurly from just server side on the browser of client
app.use(cookieParser());

// just another way like default
export { app };
