import express from "express";
import { UserControllers } from "./user.controller";
import { UserRole } from "@prisma/client";
import auth from "../../middlewares/auth";

const router = express.Router();

router.post("/create", UserControllers.createUser);
router.get("/", auth(UserRole.ADMIN), UserControllers.getUsers);
router.get("/:id", auth(), UserControllers.getSingleUser);
router.get("/teachers/list", auth(), UserControllers.teachersList);
router.get("/teacher-details/:id", auth(), UserControllers.teacherDetails);
router.delete("/:id", auth(UserRole.ADMIN), UserControllers.deleteUser);

router.patch(
  "/update/role-status/:id",
  auth(UserRole.ADMIN),
  UserControllers.updateRoleAndStatus
);
router.patch(
  "/update/:id",
  auth(UserRole.ADMIN),
  UserControllers.updateProfileUser
);
router.patch(
  "/update/profile-image/:id",
  auth(),
  UserControllers.updateProfileImage
);

export const userRoutes = router;
