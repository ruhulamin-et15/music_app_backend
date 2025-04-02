import prisma from "../../../shared/prisma";
import { Request } from "express";
import ApiError from "../../errors/ApiErrors";
import { uploadInSpace } from "../../../shared/uploadInSpace";
import { courseFilter } from "../../../shared/courseFilter";
import { paginationHelper } from "../../../shared/pagination";

//create course
const createCourseInDB = async (req: Request) => {
  const payload = req.body;
  const { teacherId } = req.params;
  const file = req.file;

  if (!file) {
    throw new ApiError(400, "No file uploaded!");
  }

  const existingCourse = await prisma.course.findFirst({
    where: { courseName: payload.courseName },
  });
  if (existingCourse) {
    throw new ApiError(409, "Course already exist!");
  }

  const courseImage = await uploadInSpace(file, "courses/courseImages");

  const newCourse = await prisma.course.create({
    data: { ...payload, image: courseImage, teacherId: teacherId },
  });

  return newCourse;
};

//single teacher - all courses
const teacherCoursesFromDB = async (req: Request) => {
  const { teacherId } = req.params;
  const { page, limit, skip, take } = paginationHelper(req.query as any);

  const courses = await prisma.course.findMany({
    where: {
      teacherId: teacherId,
    },
    select: {
      id: true,
      courseName: true,
    },
    skip,
    take,
  });

  const totalCount = await prisma.course.count({
    where: {
      teacherId: teacherId,
    },
  });

  const totalPages = Math.ceil(totalCount / limit);

  return {
    totalCount,
    totalPages,
    currentPage: page,
    courses,
  };
};

const getAllCoursesFromDB = async (req: Request) => {
  const { page, limit, search, skip, take } = paginationHelper(
    req.query as any
  );

  const searchFilter = search ? courseFilter(search) : {};

  const courses = await prisma.course.findMany({
    where: searchFilter,
    orderBy: { createdAt: "desc" },
    skip,
    take,
    include: {
      class: true,
    },
  });

  const totalCount = await prisma.course.count({
    where: searchFilter,
  });
  const totalPages = Math.ceil(totalCount / limit);
  return {
    totalCount,
    totalPages,
    currentPage: page,
    courses: courses,
  };
};

const popularCoursesFromDB = async (req: Request) => {
  const { page, limit, skip, take } = paginationHelper(req.query as any);

  const popularCourses = await prisma.course.findMany({
    include: {
      class: {
        include: {
          review: {
            select: {
              rating: true,
            },
          },
        },
      },
    },
    skip,
    take,
  });

  const sortedCourses = popularCourses.map((course) => {
    return {
      ...course,
      class: course.class.map((classItem) => {
        return {
          ...classItem,
          reviews: classItem.review.sort((a, b) => b.rating - a.rating),
        };
      }),
    };
  });

  const totalCount = await prisma.course.count();
  const totalPages = Math.ceil(totalCount / limit);

  return {
    totalCount,
    totalPages,
    currentPage: page,
    courses: sortedCourses,
  };
};

const recommendedCoursesFromDB = async (req: Request) => {
  const { page, limit, skip, take } = paginationHelper(req.query as any);

  const recommendedCourses = await prisma.course.findMany({
    include: {
      class: {
        include: {
          watchlist: true,
        },
      },
    },
    skip,
    take,
  });

  // Calculate watchlist length and sort
  const sortedCourses = recommendedCourses
    .map((course) => {
      return {
        ...course,
        totalWatchlistLength: course.class.reduce(
          (sum, classItem) => sum + classItem.watchlist.length,
          0
        ),
      };
    })
    .sort((a, b) => b.totalWatchlistLength - a.totalWatchlistLength);

  const totalCount = await prisma.course.count();
  const totalPages = Math.ceil(totalCount / limit);

  return {
    totalCount,
    totalPages,
    currentPage: page,
    courses: sortedCourses,
  };
};

const getSingleCourseFromDB = async (courseId: string) => {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      class: true,
      teacher: {
        select: {
          teacherName: true,
          id: true,
          profileImage: true,
          about: true,
        },
      },
    },
  });
  if (!course) {
    throw new ApiError(404, "course not found");
  }
  return course;
};

const createClassInDB = async (req: Request) => {
  const userId = req.params.teacherId;

  const existingClass = await prisma.class.findFirst({
    where: { className: req.body.className },
  });

  if (existingClass) {
    throw new ApiError(409, "Class already exist!");
  }

  const files = req.files as { [fieldname: string]: Express.Multer.File[] };

  // Helper function to handle file uploads
  const processImages = async (
    files: Express.Multer.File[],
    folder: string
  ) => {
    if (!files || files.length === 0) return null;
    return Promise.all(
      files.map((file) => uploadInSpace(file, `courses/class/${folder}`))
    );
  };

  // Upload files if provided
  const [thumbnail, classVideo] = await Promise.all([
    processImages(files?.thumbnail, "thumbnail"),
    processImages(files?.classVideo, "video"),
  ]);

  const newClass = await prisma.class.create({
    data: {
      ...req.body,
      thumbnail: thumbnail?.[0],
      classVideo: classVideo?.[0],
      userId: userId,
      classNo: parseInt(req.body.classNo),
    },
  });

  return newClass;
};

const watchListUpdateInDB = async (
  classId: string,
  userId: string,
  payload: {
    watchtime: string;
  }
) => {
  const runningClass = await prisma.class.findUnique({
    where: { id: classId },
  });
  if (!runningClass) {
    throw new ApiError(404, "Class not found");
  }
  const existingWatchlist = await prisma.watchlist.findFirst({
    where: { classId: classId, userId: userId },
  });

  if (existingWatchlist) {
    const result = await prisma.watchlist.update({
      where: { id: existingWatchlist.id },
      data: payload,
    });
    return result;
  }

  const result = await prisma.watchlist.create({
    data: {
      classId: classId,
      userId: userId,
      watchtime: payload.watchtime,
    },
  });

  return result;
};

const watchListFromDB = async (userId: string) => {
  const watchList = await prisma.watchlist.findMany({
    where: { userId: userId },
    include: {
      class: {
        select: {
          thumbnail: true,
          className: true,
          classVideo: true,
          classNo: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  if (watchList.length === 0) {
    throw new ApiError(404, "No class in watchlist!");
  }

  return watchList.slice(0, 5);
};

export const courseServices = {
  createCourseInDB,
  createClassInDB,
  teacherCoursesFromDB,
  watchListFromDB,
  watchListUpdateInDB,
  getAllCoursesFromDB,
  getSingleCourseFromDB,
  popularCoursesFromDB,
  recommendedCoursesFromDB,
};
