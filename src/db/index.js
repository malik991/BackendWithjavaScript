import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";
import "dotenv/config";
//import { Comment } from "../models/comment.model.js";

const connectDB = async () => {
  try {
    // console.log(`${process.env.MONGODB_URL}/${DB_NAME}`);
    const connectionObject = await mongoose.connect(
      `${process.env.MONGODB_URL}/${DB_NAME}`
    );

    console.log(
      `\n MongoDb Connected, DB HOST: ${connectionObject.connection.host}`
    );
    // Create index on the createdAt field of the Comment collection
    // const result = await Comment.createIndexes({ createdAt: -1 });
    // console.log("Index created successfully:", result);
  } catch (error) {
    console.log("Error in DB Connection: ", error);
    // process is an obj provide from NOde.js so we can use it any where
    process.exit(1);
  }
};

export default connectDB;
