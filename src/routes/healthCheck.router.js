import { Router } from "express";
import { healthCheck } from "../controllers/healthCheck.controller.js";

const router = Router();

router.route("/health-Check").get(healthCheck);

export default router;
