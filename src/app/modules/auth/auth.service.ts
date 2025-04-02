import prisma from "../../../shared/prisma";
import bcrypt from "bcryptjs";
import ApiError from "../../errors/ApiErrors";
import { jwtHelpers } from "../../../helpers/jwtHelpers";
import config from "../../../config";
import { ILogin, IOtp } from "./auth.interface";
import { ObjectId } from "mongodb";
import { User } from "@prisma/client";
import generateOTP from "../../../helpers/generateOtp";
import sendEmail from "../../../helpers/sendEmail";
import { Request } from "express";
import { uploadInSpace } from "../../../shared/uploadInSpace";

//login user
const loginUserIntoDB = async (payload: ILogin) => {
  const user = await prisma.user.findUnique({
    where: {
      email: payload.email,
    },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
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

//login with google auth
const loginUserWithGoogleAuth = async (payload: User) => {
  const existingUser = await prisma.user.findUnique({
    where: { email: payload.email },
  });

  if (existingUser) {
    const accessToken = jwtHelpers.generateToken(
      existingUser,
      config.jwt.jwt_secret as string,
      config.jwt.expires_in as string
    );

    const { password, ...userInfo } = existingUser;

    return {
      accessToken,
      userInfo,
    };
  }

  const user = await prisma.user.create({ data: payload });

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

// get profile for logged in user
const getProfileFromDB = async (userId: string) => {
  if (!ObjectId.isValid(userId)) {
    throw new ApiError(400, "Invalid user ID format");
  }
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      subscription: {
        select: {
          subscriptionId: true,
        },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });
  if (!user) {
    throw new ApiError(404, "user not found!");
  }

  const { password, createdAt, updatedAt, ...sanitizedUser } = user;

  return sanitizedUser;
};

// update user profile only logged in user
const updateProfileIntoDB = async (req: Request) => {
  const file = req.file;
  const { id } = req.user;
  const userData = req.body;

  const user = await prisma.user.findUnique({ where: { id: id } });
  if (!user) {
    throw new ApiError(404, "user not found for edit user");
  }

  let profileImage;

  if (file) {
    profileImage = await uploadInSpace(file, "profileImages");
  }

  const updatedUser = await prisma.user.update({
    where: { id: id },
    data: {
      ...userData,
      profileImage: file ? profileImage : user.profileImage,
    },
  });

  const { password, ...sanitizedUser } = updatedUser;

  return sanitizedUser;
};

//send forgot password otp
const sendForgotPasswordOtpDB = async (email: string) => {
  const existringUser = await prisma.user.findUnique({
    where: {
      email: email,
    },
  });
  if (!existringUser) {
    throw new ApiError(404, "User not found");
  }
  // Generate OTP and expiry time
  const otp = generateOTP(); // 4-digit OTP
  const OTP_EXPIRATION_TIME = 5 * 60 * 1000; // 5 minute
  const expiresAt = Date.now() + OTP_EXPIRATION_TIME;
  const subject = "Your Password Reset OTP";
  const html = `<!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Reset Password</title>
                </head>
                <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f6f9fc; margin: 0; padding: 0; line-height: 1.6;">
                    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);">
                        <div style="background-color: #FF7600; background-image: linear-gradient(135deg, #FF7600, #45a049); padding: 30px 20px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600; text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);">Reset Password OTP</h1>
                        </div>
                        <div style="padding: 20px 12px; text-align: center;">
                            <p style="font-size: 18px; color: #333333; margin-bottom: 10px;">Hello, ${existringUser.userName}</p>
                            <p style="font-size: 18px; color: #333333; margin-bottom: 20px;">Your OTP for Reseting Password:</p>
                            <p style="font-size: 36px; font-weight: bold; color: #FF7600; margin: 20px 0; padding: 10px 20px; background-color: #f0f8f0; border-radius: 8px; display: inline-block; letter-spacing: 5px;">${otp}</p>
                            <p style="font-size: 16px; color: #555555; margin-bottom: 20px; max-width: 400px; margin-left: auto; margin-right: auto;">Please Enter This OTP to Reset Your Password. This OTP is valid for 5 minutes.</p>
                            <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
                                <p style="font-size: 14px; color: #888888; margin-bottom: 4px;">Thank you for choosing our service!</p>
                                <p style="font-size: 14px; color: #888888; margin-bottom: 0;">If you didn't request this OTP, please ignore this email.</p>
                            </div>
                        </div>
                        <div style="background-color: #f9f9f9; padding: 10px; text-align: center; font-size: 12px; color: #999999;">
                            <p style="margin: 0;">© 2025 Dancefluencer. All rights reserved.</p>
                        </div>
                    </div>
                </body>
                </html>`;
  await sendEmail(email, subject, html);
  await prisma.otp.upsert({
    where: {
      email: email,
    },
    update: { otpCode: otp, expiresAt: new Date(expiresAt) },
    create: { email: email, otpCode: otp, expiresAt: new Date(expiresAt) },
  });

  return;
};

// verify otp code
const verifyForgotPasswordOtpCodeDB = async (payload: IOtp) => {
  const { email, otp } = payload;

  if (!email && !otp) {
    throw new ApiError(400, "Email and OTP are required.");
  }

  const user = await prisma.user.findUnique({ where: { email: email } });
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const userId = user.id;

  const verifyData = await prisma.otp.findUnique({
    where: {
      email: email,
    },
  });

  if (!verifyData) {
    throw new ApiError(400, "Invalid or expired OTP.");
  }

  const { otpCode: savedOtp, expiresAt } = verifyData;

  if (otp !== savedOtp) {
    throw new ApiError(401, "Invalid OTP.");
  }

  if (Date.now() > expiresAt.getTime()) {
    await prisma.otp.delete({
      where: {
        email: email,
      },
    }); // OTP has expired
    throw new ApiError(410, "OTP has expired. Please request a new OTP.");
  }

  // OTP is valid
  await prisma.otp.delete({
    where: {
      email: email,
    },
  });

  const accessToken = jwtHelpers.generateToken(
    { id: userId, email },
    config.jwt.jwt_secret as string,
    config.jwt.expires_in as string
  );

  return { accessToken: accessToken };
};

// reset password
const restForgotPasswordDB = async (newPassword: string, userId: string) => {
  const existingUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!existingUser) {
    throw new ApiError(404, "user not found");
  }
  const email = existingUser.email as string;
  const hashedPassword = await bcrypt.hash(
    newPassword,
    Number(config.jwt.gen_salt)
  );

  const result = await prisma.user.update({
    where: {
      email: email,
    },
    data: {
      password: hashedPassword,
    },
  });
  const { password, ...userInfo } = result;
  return userInfo;
};

const changePasswordInDB = async (
  payload: {
    currentPassword: string;
    newPassword: string;
  },
  userId: string
) => {
  const { currentPassword, newPassword } = payload;
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const isPasswordValid = await bcrypt.compare(
    currentPassword,
    user?.password as string
  );
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid current password");
  }
  const hashedPassword = await bcrypt.hash(
    newPassword,
    Number(config.jwt.gen_salt)
  );

  await prisma.user.update({
    where: {
      email: user.email,
    },
    data: {
      password: hashedPassword,
    },
  });
  return;
};

export const authService = {
  loginUserIntoDB,
  getProfileFromDB,
  updateProfileIntoDB,
  loginUserWithGoogleAuth,
  sendForgotPasswordOtpDB,
  verifyForgotPasswordOtpCodeDB,
  restForgotPasswordDB,
  changePasswordInDB,
};
