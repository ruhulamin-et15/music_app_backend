import express from "express";
import { authController } from "./auth.controller";
import validateRequest from "../../middlewares/validateRequest";
import { authValidation } from "./auth.validation";
import auth from "../../middlewares/auth";
import { fileUploader } from "../../../helpers/fileUploader";
import { parseBodyData } from "../../middlewares/parseBodyData";

const router = express.Router();

//login user
router.post(
  "/login",
  validateRequest(authValidation.authLoginSchema),
  authController.loginUser
);

//login with google
router.post("/google-login", authController.loginUserWithGoogle);
router.get("/profile", auth(), authController.getProfile);
router.patch(
  "/profile",
  fileUploader.profileImage,
  parseBodyData,
  auth(),
  authController.updateProfile
);
router.post("/send-otp", authController.sendForgotPasswordOtp);
router.post("/verify-otp", authController.verifyForgotPasswordOtpCode);
router.patch("/reset-password", auth(), authController.resetPassword);
router.patch("/change-password", auth(), authController.changePassword);

export const authRoute = router;
