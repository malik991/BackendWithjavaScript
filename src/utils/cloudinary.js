import "dotenv/config";
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return "local file path not found in cloudinary";
    // else upload the file on cloudinary
    const responce = await cloudinary.uploader.upload(localFilePath, {
      // alot of other option find on cloudinary site , resource type mean
      // it is jpg,png or video, by auto it will detect itself about the resource
      resource_type: "auto",
    });
    // when file uploaded to cloudinary successfullt than, delte the file from local server
    //console.log("file uploaded to cloudinary successfully!: ", responce);
    fs.unlinkSync(localFilePath);
    // we have to return the url of responce to user
    return responce;
  } catch (error) {
    // if in any error happened , the local file wil be remain our server so we need to
    // delte that file , instad of keeping garbabge on local server
    fs.unlinkSync(localFilePath); // unlinkSync is funtion which forcefully unlink or delte the file from local server temp file
    console.log("error in clouinary.js: ", error);
    return null;
  }
};

export { uploadOnCloudinary };
