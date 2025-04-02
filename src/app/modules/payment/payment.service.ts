import { Request } from "express";
import Stripe from "stripe";
import config from "../../../config";
import stripe from "../../../config/stripe";
import prisma from "../../../shared/prisma";
import { Plan, Subscription } from "@prisma/client";
import ApiError from "../../errors/ApiErrors";
import { paginationHelper } from "../../../shared/pagination";

//plan create
const createPlanInStripe = async (payload: Plan) => {
  const { planType, description, amount, currency, interval } = payload;

  // Step 1: Create a product
  const product = await stripe.products.create({
    name: planType,
    description,
  });

  // Step 2: Create a price for the product
  const price = await stripe.prices.create({
    unit_amount: amount * 100,
    currency,
    product: product.id,
    recurring: {
      interval: interval,
    },
  });

  const planInfo = await prisma.plan.create({
    data: {
      planType,
      description,
      priceId: price.id,
      productId: product.id,
      amount,
      currency,
      interval,
    },
  });

  return planInfo;
};

//get all products
const allPlansFromDB = async () => {
  const plans = await prisma.plan.findMany({
    orderBy: { createdAt: "desc" },
  });
  return plans;
};

//get active plan
const activePlansFromDB = async () => {
  const plans = await prisma.plan.findMany({
    where: { active: true },
    orderBy: { createdAt: "desc" },
  });
  return plans;
};

//get single product
const getPlanFromDB = async (planId: string) => {
  const plan = await prisma.plan.findUnique({
    where: { id: planId },
  });
  return plan;
};

//edit plan
const editPlanInStripe = async (payload: any, planId: string) => {
  const { planType, active, description } = payload;
  const plan = await prisma.plan.findUnique({
    where: { id: planId },
  });
  if (!plan) {
    throw new ApiError(404, "Plan not found");
  }
  await stripe.products.update(plan.productId, {
    name: planType,
    active: active,
  });

  const updatedPlan = await prisma.plan.update({
    where: { id: planId },
    data: {
      planType,
      active,
      description,
    },
  });
  return updatedPlan;
};

//total earnings from subscriptions
const totalEarningsFromStripe = async () => {
  let totalAmount = 0;
  let hasMore = true;
  let startingAfter = null;

  while (hasMore) {
    const invoices: any = await stripe.invoices.list({
      limit: 10000, // Adjust the number of invoices per request if needed
      starting_after: startingAfter || undefined,
    });

    // Sum the total amount from each invoice
    invoices.data.forEach((invoice: any) => {
      totalAmount += invoice.amount_paid;
    });

    hasMore = invoices.has_more;
    if (hasMore) {
      startingAfter = invoices.data[invoices.data.length - 1].id;
    }
  }

  return {
    totalAmount: totalAmount / 100,
  };
};

//create subscription
const createSubscriptionInStripe = async (
  userId: string,
  payload: Subscription
) => {
  const { paymentMethodId, priceId } = payload;

  const userInfo = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!userInfo) {
    throw new ApiError(404, "User not found");
  }

  const isExistSubscription = await prisma.subscription.findFirst({
    where: { userId: userInfo.id },
  });

  if (isExistSubscription) {
    throw new ApiError(409, "You have already subscription");
  }

  let customerId = userInfo.customerId;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: userInfo.email,
    });
    customerId = customer.id;
    await prisma.user.update({
      where: { id: userId },
      data: { customerId: customer.id },
    });
  }

  await stripe.paymentMethods.attach(paymentMethodId, {
    customer: customerId,
  });

  await stripe.customers.update(customerId, {
    invoice_settings: { default_payment_method: paymentMethodId },
  });

  const subscription: any = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: priceId }],
    expand: ["latest_invoice.payment_intent"],
  });

  const subscriptionData = {
    paymentMethodId: paymentMethodId,
    userId: userId,
    priceId: priceId,
    subscriptionId: subscription.id,
    planType: subscription.plan.interval,
  };
  const createdSubscription = await prisma.subscription.create({
    data: subscriptionData,
  });

  await prisma.user.update({
    where: { id: userId },
    data: { subscriptions: true },
  });

  return createdSubscription;
};

const cancelSubscriptionInDB = async (
  subscriptionId: string,
  userId: string
) => {
  const userInfo = await prisma.user.findUnique({
    where: { id: userId },
  });
  if (!userInfo) {
    throw new ApiError(404, "User not found");
  }
  const subscriptionData = await prisma.subscription.findFirst({
    where: { userId: userId, subscriptionId: subscriptionId },
  });
  if (!subscriptionData) {
    throw new ApiError(404, "Subscription not found");
  }
  await stripe.subscriptions.cancel(subscriptionId);
  return;
};

const updateSubscriptionInStripe = async (
  payload: Subscription,
  userId: string
) => {
  const { paymentMethodId, priceId, subscriptionId } = payload;
  const userInfo = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!userInfo) {
    throw new ApiError(404, "User not found");
  }

  const isExistingSubscription = await prisma.subscription.findFirst({
    where: { userId: userId, subscriptionId: subscriptionId },
  });

  if (!isExistingSubscription) {
    throw new ApiError(404, "Subscription not found");
  }

  const customerId = userInfo.customerId as string;

  await stripe.paymentMethods.attach(paymentMethodId, {
    customer: customerId,
  });

  await stripe.customers.update(customerId, {
    invoice_settings: { default_payment_method: paymentMethodId },
  });

  try {
    await stripe.subscriptions.cancel(subscriptionId);
  } catch (error) {
    console.log(error);
  }

  let subscription: any;
  try {
    subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      expand: ["latest_invoice.payment_intent"],
    });
  } catch (error) {
    console.log(error);
  }

  const subscriptionData = {
    paymentMethodId: paymentMethodId,
    userId: userId,
    priceId: priceId,
    subscriptionId: subscription.id,
    planType: subscription.plan.interval,
  };

  await prisma.subscription.deleteMany({
    where: {
      subscriptionId: subscriptionId,
    },
  });

  const updatedSubscription = await prisma.subscription.create({
    data: subscriptionData,
  });

  await prisma.user.update({
    where: { id: userId },
    data: { subscriptions: true },
  });
  return updatedSubscription;
};

//using for webhook
const deleteSubscriptionInStripe = async (event: Stripe.Event) => {
  const subscriptionData = event.data.object as any;
  const subscriptionId = subscriptionData.id;

  await prisma.subscription.deleteMany({
    where: {
      subscriptionId: subscriptionId,
    },
  });

  await prisma.user.updateMany({
    where: { customerId: subscriptionData.customer },
    data: { subscriptions: false },
  });

  return;
};

//using for webhook
const handelPaymentWebhook = async (req: Request) => {
  const sig = req.headers["stripe-signature"] as string;

  if (!sig) {
    console.error("Missing Stripe signature header");
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      config.stripe.webhook_secret as string
    );
    let result;
    switch (event.type) {
      //   case "customer.subscription.created":
      //     result = await createSubscriptionInDB(event);
      //     break;

      case "customer.subscription.deleted":
        result = await deleteSubscriptionInStripe(event);
        break;

      default:
        break;
    }

    return result;
  } catch (err: any) {
    console.log(err);
    return;
  }
};

const getPaymentsFromDB = async (req: Request) => {
  const { page, limit, skip, take, search } = paginationHelper(
    req.query as any
  );

  const payments = await prisma.subscription.findMany({
    select: {
      id: true,
      planType: true,
      status: true,
      user: {
        select: {
          id: true,
          userName: true,
          email: true,
        },
      },
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    skip,
    take,
  });

  const totalCount = await prisma.subscription.count();
  const totalPages = Math.ceil(totalCount / limit);
  return {
    totalCount,
    totalPages,
    currentPage: page,
    payments,
  };
};

export const paymentServices = {
  createPlanInStripe,
  allPlansFromDB,
  activePlansFromDB,
  getPlanFromDB,
  editPlanInStripe,
  totalEarningsFromStripe,
  handelPaymentWebhook,
  createSubscriptionInStripe,
  updateSubscriptionInStripe,
  cancelSubscriptionInDB,
  getPaymentsFromDB,
};
