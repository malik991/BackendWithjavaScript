import { Router } from "express";
//import asyncHandler from "express-async-handler";
import { registerUser } from "../controllers/user.controller.js";

const router = Router();

// here we will define get , post related to user
router.route("/register").post(registerUser);

export default router;
