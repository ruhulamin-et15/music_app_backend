import { z } from "zod";

const createReviewSchema = z.object({
  rating: z
    .number()
    .min(1, "Rating must be at least 1")
    .max(5, "Rating cannot exceed 5"),

  reviewText: z
    .string()
    .min(2, "reviewText must be at least 2 characters long"),
});

export const reviewsValidation = {
  createReviewSchema,
};
