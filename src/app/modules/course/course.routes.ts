import express from "express";
import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";
import { courseControllers } from "./course.controller";
import { fileUploader } from "../../../helpers/fileUploader";
import { parseBodyData } from "../../middlewares/parseBodyData";

const router = express.Router();

router.post(
  "/create/:teacherId",
  fileUploader.courseImage,
  parseBodyData,
  auth(UserRole.ADMIN),
  courseControllers.createCourse
);

router.get("/all-courses", auth(), courseControllers.getAllCourses);
router.get("/popular-courses", auth(), courseControllers.popularCourses);
router.get(
  "/recommended-courses",
  auth(),
  courseControllers.recommendedCourses
);
router.get(
  "/single/course/:courseId",
  auth(),
  courseControllers.getSingleCourse
);
router.get(
  "/teacher/courses/:teacherId",
  auth(),
  courseControllers.teacherCourses
);

router.post(
  "/class/create/:teacherId",
  fileUploader.uploadMultiple,
  parseBodyData,
  auth(UserRole.ADMIN),
  courseControllers.createClass
);

router.post(
  "/watch/create-update/:classId",
  auth(),
  courseControllers.updateCreateWatchlist
);
router.get("/watch/list", auth(), courseControllers.watchList);

export const courseRoute = router;
