import express from "express";
import { reviewControllers } from "./review.controller";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { reviewsValidation } from "./review.validation";

const router = express.Router();

router.post(
  "/create/:classId",
  auth(),
  validateRequest(reviewsValidation.createReviewSchema),
  reviewControllers.createReview
);
router.get("/all-reviews", auth(), reviewControllers.getReviews);

export const reviewRoute = router;
