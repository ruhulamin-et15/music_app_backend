import { User } from "@prisma/client";
import ApiError from "../../errors/ApiErrors";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import prisma from "../../../shared/prisma";
import { Request } from "express";
import { jwtHelpers } from "../../../helpers/jwtHelpers";
import config from "../../../config";
import { searchFilter } from "../../../shared/searchFilter";

//create new user
const createUserIntoDB = async (payload: User) => {
  const existingUser = await prisma.user.findFirst({
    where: { email: payload.email },
  });
  if (existingUser) {
    throw new ApiError(409, "email already exist!");
  }

  const hashedPassword = await bcrypt.hash(payload.password as string, 10);

  const user = await prisma.user.create({
    data: {
      ...payload,
      password: hashedPassword,
    },
  });

  const accessToken = jwtHelpers.generateToken(
    user,
    config.jwt.jwt_secret as string,
    config.jwt.expires_in as string
  );

  const { password, ...sanitizedUser } = user;

  return {
    accessToken,
    user: sanitizedUser,
  };
};

//get single user
const getSingleUserIntoDB = async (id: string) => {
  if (!ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid user ID format");
  }
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw new ApiError(404, "user not found!");
  }

  const { password, ...sanitizedUser } = user;
  return sanitizedUser;
};

//get all users
const getUsersIntoDB = async (req: Request) => {
  let { page = 1, limit = 10 } = req.query;
  page = Number(page);
  limit = Number(limit);

  if (isNaN(page) || page < 1) page = 1;
  if (isNaN(limit) || limit < 1) limit = 10;

  const skip = (page - 1) * limit;
  const take = limit;

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    skip,
    take,
    where: {
      NOT: {
        role: "ADMIN",
      },
    },
  });

  const totalCount = await prisma.user.count();

  const sanitizedUsers = users.map((user) => {
    const { password, ...sanitizedUser } = user;
    return sanitizedUser;
  });

  const totalPages = Math.ceil(totalCount / limit);

  return {
    totalCount,
    totalPages,
    currentPage: page,
    users: sanitizedUsers,
  };
};

const teacherListFromDB = async (req: Request) => {
  let { page = 1, limit = 10, search = "" } = req.query;

  page = Number(page);
  limit = Number(limit);
  search = String(search);

  const searchFilters = search ? searchFilter(search) : {};

  if (isNaN(page) || page < 1) page = 1;
  if (isNaN(limit) || limit < 1) limit = 10;

  const skip = (page - 1) * limit;
  const take = limit;

  const teachers = await prisma.teacher.findMany({
    where: searchFilters,
    orderBy: { createdAt: "desc" },
    skip,
    take,
  });

  const totalCount = await prisma.teacher.count({
    where: searchFilters,
  });

  const totalPages = Math.ceil(totalCount / limit);

  return {
    totalCount,
    totalPages,
    currentPage: page,
    teachers,
  };
};

const teacherDetailsFromDB = async (teacherId: string) => {
  const teacher = await prisma.teacher.findUnique({
    where: { id: teacherId },
    include: { course: true },
  });
  if (!teacher) {
    throw new ApiError(404, "Teacher not found!");
  }

  // Fetch courses and include classes and their reviews
  const courses = await prisma.course.findMany({
    where: { teacherId: teacher.id },
    include: {
      class: {
        include: {
          review: true,
        },
      },
    },
  });

  // Calculate average ratings for each course and overall
  let totalOverallRating = 0;
  let totalOverallReviews = 0;

  courses.map((course) => {
    let totalRating = 0;
    let totalReviews = 0;

    course.class.forEach((classItem) => {
      classItem.review.forEach((review) => {
        totalRating += review.rating;
        totalReviews++;
      });
    });

    // Add to overall totals
    totalOverallRating += totalRating;
    totalOverallReviews += totalReviews;

    const averageRating = totalReviews > 0 ? totalRating / totalReviews : 0;

    return {
      averageRating: parseFloat(averageRating.toFixed(2)), // Round to 2 decimal places
      totalReviews,
    };
  });

  // Calculate the overall average rating
  const overallAverageRating =
    totalOverallReviews > 0
      ? parseFloat((totalOverallRating / totalOverallReviews).toFixed(2))
      : 0;

  return {
    profileImage: teacher.profileImage,
    userName: teacher.teacherName,
    totalCourses: teacher.course.length,
    overallAverageRating,
    designation: teacher.designation,
    about: teacher.about,
    courses: teacher.course.slice(0, 3),
  };
};

// update user profile
const updateUserProfileIntoDB = async (id: string, userData: any) => {
  if (!ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid user ID format");
  }
  const existingUser = await getSingleUserIntoDB(id);

  if (!existingUser) {
    throw new ApiError(404, "user not found for edit user");
  }

  const { email, password, status, role, ...filteredData } = userData;

  const updatedUser = await prisma.user.update({
    where: { id },
    data: filteredData,
  });

  const { password: savaPassword, ...sanitizedUser } = updatedUser;

  return sanitizedUser;
};

//update profile image
const updateProfileImageDB = async (profileImage: any, id: string) => {
  if (!ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid user ID format");
  }
  const existingUser = await getSingleUserIntoDB(id);

  if (!existingUser) {
    throw new ApiError(404, "user not found for edit user");
  }
  const updatedUserProfileImage = await prisma.user.update({
    where: { id },
    data: profileImage,
  });

  const { password: savaPassword, ...sanitizedUser } = updatedUserProfileImage;

  return sanitizedUser;
};

// update role and status
const updateUserRoleAndStatusDB = async (userData: User, id: string) => {
  if (!ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid user ID format");
  }
  const existingUser = await getSingleUserIntoDB(id);

  if (!existingUser) {
    throw new ApiError(404, "user not found for edit user");
  }

  const { status, role } = userData;

  const updateRoleOrStatus = await prisma.user.update({
    where: { id },
    data: {
      ...(role && { role }),
      ...(status && { status }),
    },
  });
  const { password: savaPassword, ...sanitizedUser } = updateRoleOrStatus;
  return sanitizedUser;
};

//delete user
const deleteUserIntoDB = async (userId: string, loggedId: string) => {
  if (!ObjectId.isValid(userId)) {
    throw new ApiError(400, "Invalid user ID format");
  }

  if (userId === loggedId) {
    throw new ApiError(403, "You can't delete your own account!");
  }
  const existingUser = await getSingleUserIntoDB(userId);
  if (!existingUser) {
    throw new ApiError(404, "user not found for delete this");
  }
  await prisma.user.delete({
    where: { id: userId },
  });
  return;
};

export const userService = {
  createUserIntoDB,
  getUsersIntoDB,
  getSingleUserIntoDB,
  updateUserProfileIntoDB,
  deleteUserIntoDB,
  updateProfileImageDB,
  updateUserRoleAndStatusDB,
  teacherListFromDB,
  teacherDetailsFromDB,
};
