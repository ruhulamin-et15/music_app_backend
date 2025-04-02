import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import { courseServices } from "./course.service";
import sendResponse from "../../../shared/sendResponse";

const createCourse = catchAsync(async (req: Request, res: Response) => {
  const result = await courseServices.createCourseInDB(req);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Course created successfully",
    data: result,
  });
});

const getAllCourses = catchAsync(async (req: Request, res: Response) => {
  const result = await courseServices.getAllCoursesFromDB(req);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Courses retrived successfully",
    data: result,
  });
});

const recommendedCourses = catchAsync(async (req: Request, res: Response) => {
  const result = await courseServices.recommendedCoursesFromDB(req);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Recommended courses retrieved success",
    data: result,
  });
});

const popularCourses = catchAsync(async (req: Request, res: Response) => {
  const result = await courseServices.popularCoursesFromDB(req);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Popular courses retrieved success",
    data: result,
  });
});

const getSingleCourse = catchAsync(async (req: Request, res: Response) => {
  const result = await courseServices.getSingleCourseFromDB(
    req.params.courseId
  );
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Course retrieved successfully",
    data: result,
  });
});

const teacherCourses = catchAsync(async (req, res) => {
  const result = await courseServices.teacherCoursesFromDB(req);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Teacher courses retrived successfully",
    data: result,
  });
});

const createClass = catchAsync(async (req: Request, res: Response) => {
  const result = await courseServices.createClassInDB(req);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Class created successfully",
    data: result,
  });
});

const updateCreateWatchlist = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user.id;
    const { classId } = req.params;
    const payload = req.body;
    const result = await courseServices.watchListUpdateInDB(
      classId,
      userId,
      payload
    );

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Watchlist updated/created successfully",
      data: result,
    });
  }
);

const watchList = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const result = await courseServices.watchListFromDB(userId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Watch list retrieved successfully",
    data: result,
  });
});

export const courseControllers = {
  createCourse,
  createClass,
  teacherCourses,
  updateCreateWatchlist,
  watchList,
  getAllCourses,
  getSingleCourse,
  popularCourses,
  recommendedCourses,
};
