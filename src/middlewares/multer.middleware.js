import multer from "multer";

// disk storage
const storage = multer.diskStorage({
  // req come from user req, file provide by the multer in user req, cb callback
  destination: function (req, file, cb) {
    cb(null, "./public/temp");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.originalname + "-" + uniqueSuffix);
  },
});

export const upload = multer({ storage: storage }); // storage is our method
