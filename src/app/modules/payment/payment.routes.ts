import express from "express";
import { paymentControllers } from "./payment.controller";
import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";

const router = express.Router();

router.post(
  "/create/stripe-plan",
  auth(UserRole.ADMIN),
  paymentControllers.createPlan
);
router.get("/stripe-plans", paymentControllers.getAllPlans);
router.get("/active-plans", paymentControllers.getActivePlans);
router.get("/stripe-plan/:planId", paymentControllers.singlePlan);
router.patch(
  "/update-plan/:planId",
  auth(UserRole.ADMIN),
  paymentControllers.editPlanInStripe
);
router.get(
  "/total-earnings",
  auth(UserRole.ADMIN),
  paymentControllers.totalEarnings
);

router.post(
  "/create/stripe-subscription",
  auth(),
  paymentControllers.createSubcription
);

router.patch(
  "/update/stripe-subscription",
  auth(),
  paymentControllers.updateSubscription
);

router.delete(
  "/cancel/stripe-subscription",
  auth(),
  paymentControllers.cancelSubscription
);

router.get("/payments", auth(UserRole.ADMIN), paymentControllers.allPayments);

export const paymentRoute = router;
