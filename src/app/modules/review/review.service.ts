import { Review } from "@prisma/client";
import prisma from "../../../shared/prisma";
import ApiError from "../../errors/ApiErrors";
import { Request } from "express";

const createReviewInDB = async (
  payload: Review,
  userId: string,
  classId: string
) => {
  const isExist = await prisma.review.findFirst({
    where: { userId: userId, classId: classId },
  });
  if (isExist) {
    throw new ApiError(409, "Review already exists for this course and user");
  }

  const course = await prisma.class.findUnique({ where: { id: classId } });
  if (!course) {
    throw new ApiError(404, "Course not found");
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const review = await prisma.review.create({
    data: {
      ...payload,
      userId: userId,
      classId: classId,
      teacherId: course.userId,
    },
  });

  return review;
};

const getReviesFromDB = async (req: Request) => {
  let { page = 1, limit = 10 } = req.query;
  page = Number(page);
  limit = Number(limit);

  if (isNaN(page) || page < 1) page = 1;
  if (isNaN(limit) || limit < 1) limit = 10;

  const skip = (page - 1) * limit;
  const take = limit;
  const reviews = await prisma.review.findMany({
    include: {
      user: {
        select: {
          userName: true,
          id: true,
          profileImage: true,
          about: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    skip,
    take,
  });
  const totalCount = await prisma.review.count();
  const totalPages = Math.ceil(totalCount / limit);

  return {
    totalCount,
    totalPages,
    currentPage: page,
    reviews: reviews,
  };
};

export const reviewService = {
  createReviewInDB,
  getReviesFromDB,
};
