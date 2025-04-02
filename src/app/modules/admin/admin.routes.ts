import express from "express";
import { adminControllers } from "./admin.controller";
import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";
import { fileUploader } from "../../../helpers/fileUploader";
import { parseBodyData } from "../../middlewares/parseBodyData";

const router = express.Router();

router.post("/login", adminControllers.adminLogin);
router.post(
  "/create/teacher",
  auth(UserRole.ADMIN),
  fileUploader.profileImage,
  parseBodyData,
  adminControllers.createTeacher
);
router.get(
  "/teachers/list",
  auth(UserRole.ADMIN),
  adminControllers.teachersList
);
router.patch(
  "/teacher/:teacherId",
  auth(UserRole.ADMIN),
  fileUploader.profileImage,
  parseBodyData,
  adminControllers.updateTeacher
);
router.delete(
  "/teacher/:teacherId",
  auth(UserRole.ADMIN),
  adminControllers.deleteTeacher
);
router.delete(
  "/course/:courseId",
  auth(UserRole.ADMIN),
  adminControllers.deleteCourse
);
router.delete(
  "/class/:classId",
  auth(UserRole.ADMIN),
  adminControllers.deleteClass
);
router.get("/all-courses", auth(UserRole.ADMIN), adminControllers.coursesList);
router.get(
  "/teacher-courses/:teacherId",
  auth(UserRole.ADMIN),
  adminControllers.coursesByTeacherId
);
router.get("/overview", auth(UserRole.ADMIN), adminControllers.overView);
router.post(
  "/create-user",
  auth(UserRole.ADMIN),
  fileUploader.profileImage,
  parseBodyData,
  adminControllers.createUser
);

export const adminRoute = router;
