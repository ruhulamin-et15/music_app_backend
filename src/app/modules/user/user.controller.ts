import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { userService } from "./user.services";

// register user
const createUser = catchAsync(async (req: Request, res: Response) => {
  const result = await userService.createUserIntoDB(req.body);
  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: "User created successfully",
    data: result,
  });
});

//get users
const getUsers = catchAsync(async (req: Request, res: Response) => {
  const users = await userService.getUsersIntoDB(req);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "users retrived successfully",
    data: users,
  });
});

//get single user
const getSingleUser = catchAsync(async (req: Request, res: Response) => {
  const user = await userService.getSingleUserIntoDB(req.params.id);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "user retrived successfully",
    data: user,
  });
});

//get teacher
const teachersList = catchAsync(async (req: Request, res: Response) => {
  const teachers = await userService.teacherListFromDB(req);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "teachers retrived successfully",
    data: teachers,
  });
});

const teacherDetails = catchAsync(async (req: Request, res: Response) => {
  const teacher = await userService.teacherDetailsFromDB(req.params.id);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "teacher retrived successfully",
    data: teacher,
  });
});

//update user
const updateProfileUser = catchAsync(async (req: Request, res: Response) => {
  const updatedUser = await userService.updateUserProfileIntoDB(
    req.params.id,
    req.body
  );
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "user updated successfully",
    data: updatedUser,
  });
});

// update profile image
const updateProfileImage = catchAsync(async (req: Request, res: Response) => {
  const profileImage = req.body;
  const userId = req.params.id as string;
  const result = await userService.updateUserRoleAndStatusDB(
    profileImage,
    userId
  );

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "user updated successfully",
    data: result,
  });
});

// update role and status
const updateRoleAndStatus = catchAsync(async (req: Request, res: Response) => {
  const userData = req.body;
  const userId = req.params.id as string;
  const result = await userService.updateUserRoleAndStatusDB(userData, userId);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "user updated successfully",
    data: result,
  });
});

//delete user
const deleteUser = catchAsync(async (req: any, res: Response) => {
  const userId = req.params.id;
  const loggedId = req.user.id;
  await userService.deleteUserIntoDB(userId, loggedId);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "user deleted successfully",
  });
});

export const UserControllers = {
  createUser,
  getUsers,
  getSingleUser,
  updateProfileUser,
  deleteUser,
  updateProfileImage,
  updateRoleAndStatus,
  teachersList,
  teacherDetails,
};
