import "dotenv/config";
import connectDB from "./db/index.js";
import { app } from "./app.js";

const runningPort = process.env.PORT || 8000;

// ---------------- 2nd Approach -----------------------
connectDB()
  .then(() => {
    // if connection establish now connect with app
    app.listen(runningPort, () => {
      console.log(`server is runnning at ${runningPort}`);
    });
  })
  .catch((err) => {
    console.log(`Db connection Error! in main index.js: ${err}`);
  });
/*
import express from "express";
/// ------- Approach 1 ------------
const app = express();
// ifi function approach in JS which execute a funtion imidiatly
// just for good practise use ; before iffi
// db connection always in async and await
(async () => {
  try {
    // now here we will add the DB name from constants.js,
    //enter / and dbName thats why we remove slash in .env
    await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`);
    // check the error either our app is communicate with DB or not, if error than
    app.on("Error", (error) => {
      console.log("Error in comunication between app and Db: ", error);
      throw error;
    });
    //if not err
    app.listen(process.env.PORT, () => {
      console.log(`App is Listening on port ${process.env.PORT}`);
    });
  } catch (error) {
    console.log("Error in connection", error);
    throw error;
  }
})();

*/
