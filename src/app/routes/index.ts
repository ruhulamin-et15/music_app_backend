import express from "express";
import { userRoutes } from "../modules/user/user.route";
import { authRoute } from "../modules/auth/auth.routes";
import { paymentRoute } from "../modules/payment/payment.routes";
import { courseRoute } from "../modules/course/course.routes";
import { reviewRoute } from "../modules/review/review.routes";
import { adminRoute } from "../modules/admin/admin.routes";

const router = express.Router();

const moduleRoutes = [
  {
    path: "/users",
    route: userRoutes,
  },
  {
    path: "/auth",
    route: authRoute,
  },
  {
    path: "/payment",
    route: paymentRoute,
  },
  {
    path: "/course",
    route: courseRoute,
  },
  {
    path: "/review",
    route: reviewRoute,
  },
  {
    path: "/admin",
    route: adminRoute,
  },
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
