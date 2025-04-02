import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { adminServices } from "./admin.service";

//admin login
const adminLogin = catchAsync(async (req, res) => {
  const result = await adminServices.adminLogin(req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Admin successfully logged in",
    data: result,
  });
});

//create teacher
const createTeacher = catchAsync(async (req, res) => {
  const teacher = await adminServices.createTeacher(req);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Teacher created successfully",
    data: teacher,
  });
});

//get all teachers
const teachersList = catchAsync(async (req, res) => {
  const teachers = await adminServices.teacherListFromDB(req);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "teachers retrived successfully",
    data: teachers,
  });
});

//update teacher
const updateTeacher = catchAsync(async (req, res) => {
  const updatedTeacher = await adminServices.updateTeacherInDB(req);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Teacher updated successfully",
    data: updatedTeacher,
  });
});

//delete teacher
const deleteTeacher = catchAsync(async (req, res) => {
  const { teacherId } = req.params;
  await adminServices.deleteTeacherInDB(teacherId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Teacher deleted successfully",
  });
});

//get all courses
const coursesList = catchAsync(async (req, res) => {
  const courses = await adminServices.getAllCoursesFromDB(req);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "courses retrived successfully",
    data: courses,
  });
});

//all courese by teacher id
const coursesByTeacherId = catchAsync(async (req, res) => {
  const courses = await adminServices.coursesByTeacherId(req);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "courses retrived successfully",
    data: courses,
  });
});

const overView = catchAsync(async (req, res) => {
  const overview = await adminServices.overviewFromDB();

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "overview retrived successfully",
    data: overview,
  });
});

//delete course
const deleteCourse = catchAsync(async (req, res) => {
  const { courseId } = req.params;
  await adminServices.deleteCourseInDB(courseId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Course deleted successfully",
  });
});

//delete course
const deleteClass = catchAsync(async (req, res) => {
  const { classId } = req.params;
  await adminServices.deleteClassInDB(classId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Class deleted successfully",
  });
});

//create user
const createUser = catchAsync(async (req, res) => {
  const user = await adminServices.createUser(req);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "User created successfully",
    data: user,
  });
});

export const adminControllers = {
  createTeacher,
  teachersList,
  updateTeacher,
  deleteTeacher,
  coursesList,
  coursesByTeacherId,
  adminLogin,
  overView,
  deleteCourse,
  deleteClass,
  createUser,
};
