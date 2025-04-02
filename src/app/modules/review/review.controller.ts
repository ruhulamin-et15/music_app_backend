import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { reviewService } from "./review.service";

const createReview = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { classId } = req.params;
  const result = await reviewService.createReviewInDB(
    req.body,
    userId,
    classId
  );

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Review created successfully",
    data: result,
  });
});

const getReviews = catchAsync(async (req, res) => {
  const reviews = await reviewService.getReviesFromDB(req);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Reviews retrived successfully",
    data: reviews,
  });
});

export const reviewControllers = {
  createReview,
  getReviews,
};
