import fs from "fs";
export const cleanupFilesOnError = (err, req, res, next) => {
  const { avatarLocalfilePath, coverImgLocalPath } = req;

  if (avatarLocalfilePath && fs.existsSync(avatarLocalfilePath)) {
    fs.unlinkSync(avatarLocalfilePath);
  }
  if (coverImgLocalPath && fs.existsSync(coverImgLocalPath)) {
    fs.unlinkSync(coverImgLocalPath);
  }

  next(err); // Pass the error to the default error handler
};
