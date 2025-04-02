import bcrypt from "bcryptjs";
import { courseFilter } from "../../../shared/courseFilter";
import prisma from "../../../shared/prisma";
import { searchFilter } from "../../../shared/searchFilter";
import { uploadInSpace } from "../../../shared/uploadInSpace";
import ApiError from "../../errors/ApiErrors";
import { Request } from "express";
import { ILogin } from "../auth/auth.interface";
import { jwtHelpers } from "../../../helpers/jwtHelpers";
import config from "../../../config";
import { paginationHelper } from "../../../shared/pagination";
import { User } from "@prisma/client";
import cron from "node-cron";

// admin login
const adminLogin = async (payload: ILogin) => {
  const user = await prisma.user.findUnique({
    where: {
      email: payload.email,
    },
    select: {
      id: true,
      userName: true,
      email: true,
      profileImage: true,
      role: true,
      password: true,
    },
  });

  if (!user) {
    throw new ApiError(404, "Admin not found");
  }

  if (user.role !== "ADMIN") {
    throw new ApiError(403, "Unauthorized access");
  }

  const isPasswordValid = await bcrypt.compare(
    payload.password,
    user?.password as string
  );

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid credentials");
  }

  const accessToken = jwtHelpers.generateToken(
    user,
    config.jwt.jwt_secret as string,
    config.jwt.expires_in as string
  );

  const { password, ...userInfo } = user;

  return {
    accessToken,
    userInfo,
  };
};

//create new user
const createTeacher = async (req: Request) => {
  const payload = req.body;
  const file = req.file as Express.Multer.File;

  if (!file) {
    throw new ApiError(400, "No profile image uploaded!");
  }

  const profileImage = await uploadInSpace(file, "profileImages/teachers");

  const existingTeacher = await prisma.teacher.findUnique({
    where: { email: payload.email },
  });
  if (existingTeacher) {
    throw new ApiError(409, "email already exist!");
  }

  const teacher = await prisma.teacher.create({
    data: { ...payload, profileImage },
  });

  return teacher;
};

// Get all teachers with pagination and search
const teacherListFromDB = async (req: Request) => {
  const { page, limit, skip, take, search } = paginationHelper(
    req.query as any
  );

  const searchFilters = search ? searchFilter(search) : {};

  const teachers = await prisma.teacher.findMany({
    where: searchFilters || {},
    orderBy: { createdAt: "desc" },
    skip,
    take,
  });

  const totalCount = await prisma.teacher.count({ where: searchFilters });
  const totalPages = Math.ceil(totalCount / limit);

  return {
    totalCount,
    totalPages,
    currentPage: page,
    teachers,
  };
};

// Update a teacher
const updateTeacherInDB = async (req: Request) => {
  const { teacherId } = req.params;
  const file = req.file as Express.Multer.File;
  const payload = req.body;
  let profileImage = undefined;

  if (req.file) {
    profileImage = await uploadInSpace(file, "profileImages/teachers");
  }

  const updatedTeacher = await prisma.teacher.update({
    where: { id: teacherId },
    data: { ...payload, profileImage },
  });

  return updatedTeacher;
};

// Delete a teacher
const deleteTeacherInDB = async (teacherId: string) => {
  const existingTeacher = await prisma.teacher.findUnique({
    where: { id: teacherId },
  });
  if (!existingTeacher) {
    throw new ApiError(404, "Teacher not found!");
  }

  return await prisma.teacher.delete({ where: { id: teacherId } });
};

//get all coureses
const getAllCoursesFromDB = async (req: Request) => {
  const { page, limit, skip, take, search } = paginationHelper(
    req.query as any
  );

  const searchFilters = search ? courseFilter(search) : {};

  const courses = await prisma.course.findMany({
    where: searchFilters,
    orderBy: { createdAt: "desc" },
    skip,
    take,
    include: {
      class: true,
      teacher: true,
    },
  });

  const totalCount = await prisma.course.count({
    where: searchFilters,
  });
  const totalPages = Math.ceil(totalCount / limit);
  return {
    totalCount,
    totalPages,
    currentPage: page,
    courses: courses,
  };
};

// Get all courses by Teacher ID with pagination and search
const coursesByTeacherId = async (req: Request) => {
  const { teacherId } = req.params;
  const { page, limit, skip, take, search } = paginationHelper(
    req.query as any
  );

  const searchFilters = search ? courseFilter(search) : {};

  const courses = await prisma.course.findMany({
    where: {
      teacherId: teacherId,
      ...(searchFilters && searchFilters),
    },
    skip,
    take,
  });

  const totalCount = await prisma.course.count({
    where: {
      teacherId: teacherId,
      ...(searchFilters && searchFilters),
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

//delete course
const deleteCourseInDB = async (courseId: string) => {
  const existingCourse = await prisma.course.findUnique({
    where: { id: courseId },
  });
  if (!existingCourse) {
    throw new ApiError(404, "Course not found!");
  }

  await prisma.course.delete({ where: { id: courseId } });
  await prisma.class.deleteMany({
    where: {
      courseId: courseId,
    },
  });

  return;
};

//delete class
const deleteClassInDB = async (classId: string) => {
  const existingCourse = await prisma.class.findUnique({
    where: { id: classId },
  });
  if (!existingCourse) {
    throw new ApiError(404, "Course not found!");
  }

  return await prisma.class.delete({ where: { id: classId } });
};

//admin overview
const overviewFromDB = async () => {
  const teachersCount = await prisma.teacher.count();
  const coursesCount = await prisma.course.count();
  const studentsCount = await prisma.user.count();
  const classesCount = await prisma.class.count();
  const mostViewedClass = await prisma.watchlist.groupBy({
    by: ["classId"],
    _count: {
      classId: true,
    },
    orderBy: {
      _count: {
        classId: "desc",
      },
    },
    take: 1,
  });
  const courses = await prisma.course.findMany({
    include: {
      class: {
        include: {
          watchlist: true,
        },
      },
    },
  });
  const topCourse = courses
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

  let classDetails: any = "No Class Found";
  if (mostViewedClass[0]?.classId !== null) {
    classDetails = await prisma.class.findFirst({
      where: { id: mostViewedClass[0]?.classId as string },
    });
  }

  const topTeacher = await prisma.review.groupBy({
    by: ["teacherId"],
    _count: {
      rating: true,
    },
    orderBy: {
      _count: {
        rating: "desc",
      },
    },
    take: 1,
  });

  let teacherDetails: any = "No Teacher Found";
  if (topTeacher.length > 0 && topTeacher[0]?.teacherId) {
    teacherDetails = await prisma.teacher.findUnique({
      where: { id: topTeacher[0].teacherId },
    });
  }

  return {
    totalTeachers: teachersCount,
    totalCourses: coursesCount,
    totalStudents: studentsCount,
    totalClasses: classesCount,
    topCourse: topCourse[0],
    mostViewedClass: classDetails,
    topTeacher: teacherDetails,
  };
};

const createUser = async (req: Request) => {
  const userId = req.user.id;
  const payload = req.body;
  const file = req.file;

  let profileImage;

  if (file) {
    profileImage = await uploadInSpace(file, "profileImages");
  }
  const existingUser = await prisma.user.findUnique({
    where: { email: payload.email },
  });
  if (existingUser) {
    throw new ApiError(409, "User already exist!");
  }
  const hashedPassword = await bcrypt.hash(payload.password as string, 10);

  const user = await prisma.user.create({
    data: {
      ...payload,
      userId: userId,
      password: hashedPassword,
      profileImage: file ? profileImage : null,
      subscriptions: payload.subscriptions === "true" ? true : false,
      // subscriptions: Boolean(payload.subscriptions),
      // subscriptions: JSON.parse(payload.subscriptions),
    },
  });

  return user;
};

const cancelSubscription = async () => {
  await prisma.user.updateMany({
    where: {
      userId: {
        not: null,
      },
      subscriptions: true,
    },
    data: { subscriptions: false, userId: null },
  });
};

const now = new Date();
const nextMonth = now.getMonth() + 1;
const nextYear = now.getFullYear() + (nextMonth > 11 ? 1 : 0);
const cronExpression = `0 0 1 ${(nextMonth % 12) + 1} *`;

const job = cron.schedule(cronExpression, async () => {
  await cancelSubscription();
  job.stop();
});
console.log(
  `Scheduled cancelSubscription for ${new Date(
    nextYear,
    nextMonth % 12,
    1,
    0,
    0,
    0
  )}`
);

export const adminServices = {
  createTeacher,
  teacherListFromDB,
  updateTeacherInDB,
  deleteTeacherInDB,
  getAllCoursesFromDB,
  coursesByTeacherId,
  adminLogin,
  overviewFromDB,
  deleteCourseInDB,
  deleteClassInDB,
  createUser,
};
