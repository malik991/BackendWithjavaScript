import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";
import "dotenv/config";

const connectDB = async () => {
  try {
    // console.log(`${process.env.MONGODB_URL}/${DB_NAME}`);
    const connectionObject = await mongoose.connect(
      `${process.env.MONGODB_URL}/${DB_NAME}`
    );

    console.log(
      `\n MongoDb Connected, DB HOST: ${connectionObject.connection.host}`
    );
  } catch (error) {
    console.log("Error in DB Connection: ", error);
    // process is an obj provide from NOde.js so we can use it any where
    process.exit(1);
  }
};

export default connectDB;
