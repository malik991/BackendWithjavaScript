import "dotenv/config";
import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken"; // its a bearer tokan like a key who have this key we will give hom permission to accesss

const userSchema = new Schema(
  {
    userName: {
      type: String,
      required: [true, "user name is reuired!"],
      unique: true,
      lowercase: true,
      trim: true,
      index: true, // if any field which is searchable than make it index:true in mongodb
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    avatar: {
      type: String, // cloudunery service like aws give URL for access
      required: true,
    },
    coverImage: {
      type: String, // cloudnery URL
    },
    watchHistory: [
      {
        type: Schema.Types.ObjectId,
        ref: "Video",
      },
    ],
    password: {
      type: String,
      required: [true, "password is required!"],
    },
    refreshToken: {
      type: String,
    },
  },
  { timestamps: true }
);

// write the hook of pre , which execute just b4 the insertion of data in db and encrypt pwd.
// first paramter of hook is , which event like validate,save,delte etc from mongoose docs
// 2nd its take call back but not use ()=> like this cos it do not have this property, so how we can access the properties of user schema
// and it take next , coz its middleware, so at end we call next() to pas the flag to next middlware

// if we dont check the password is modifeid so every time our pasword wil be re-encrypt
// even when name is update or avatar is updated coz it triggered on "save" event.
userSchema.pre("save", async function (next) {
  // if password not modifeid so just return next();
  if (!this.isModified("password")) return next();
  // otherwise password modified than execute and encrypt the password
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// define custome method to check the password from user
userSchema.methods.isPasswordCorrect = async function (userEneterPassword) {
  // here methods has also power to get the property of schemas by "this"
  return await bcrypt.compare(userEneterPassword, this.password);
};

// define methods from mongoose schema for access and refrsh tokan
userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      // take payload (Data)
      _id: this._id, // this._id coming from DB
      email: this.email,
      username: this.userName,
      fullName: this.fullName,
    },
    // take token
    process.env.ACCESS_TOKEN_SECRET,
    {
      // take expiry of tokan
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    }
  );
};
userSchema.methods.generateRefreshToken = function () {
  // in refrsh tokan we jst take _id coz it refresh again and again
  return jwt.sign(
    {
      // take payload (Data)
      _id: this._id, // this._id coming from DB
    },
    // take token
    process.env.REFRESH_TOKEN_SECRET,
    {
      // take expiry of tokan
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    }
  );
};

export const User = mongoose.model("User", userSchema);
