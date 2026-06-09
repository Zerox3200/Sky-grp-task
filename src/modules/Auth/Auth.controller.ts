import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { Op } from "sequelize";
import type { Request, Response } from "express";
import { User } from "../../../DB/index.js";
import type { UserInstance } from "../../../DB/Users/User.model.js";
import { ERROR_CODES } from "../../constants/errorCodes.js";
import { SendMail } from "../../utils/sendmail.js";
import { ErrorCatch } from "../../utils/ErrorCatch.js";
import { invalidateCache } from "../../helpers/cache.helpers.js";
import { errorResponse, successResponse } from "../../helpers/response.helpers.js";
import { getJwtSecret } from "../../utils/jwt.js";

const OTP_EXPIRY_MS = 10 * 60 * 1000;

const hashValue = (value: string): string =>
  crypto.createHash("sha256").update(value).digest("hex");

const signAccessToken = (user: UserInstance): string =>
  jwt.sign({ id: user.id, role: user.role }, getJwtSecret(), {
    expiresIn: "15m",
  });

const generateRefreshToken = (): string => crypto.randomBytes(40).toString("hex");

const saveRefreshToken = async (user: UserInstance, refreshToken: string): Promise<void> => {
  await user.update({
    refreshToken: hashValue(refreshToken),
    refreshTokenExpires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });
};

const issueAuthTokens = async (user: UserInstance) => {
  const accessToken = signAccessToken(user);
  const refreshToken = generateRefreshToken();
  await saveRefreshToken(user, refreshToken);

  return { accessToken, refreshToken };
};

const assertPassword = (plain: string, hash: string): boolean => bcrypt.compareSync(plain, hash);

export const signUp = ErrorCatch(async (req: Request, res: Response) => {
  const { name, email, password } = req.body as {
    name: string;
    email: string;
    password: string;
  };

  const existing = await User.findOne({ where: { email } });
  if (existing) {
    return errorResponse(res, {
      statusCode: 409,
      message: "Email already exists",
      code: ERROR_CODES.EMAIL_ALREADY_EXISTS,
      details: { email },
    });
  }

  const hashedPassword = bcrypt.hashSync(password, +(process.env.saltRound || 8));
  const user = await User.unscoped().create({
    name,
    email,
    password: hashedPassword,
  });

  const { accessToken, refreshToken } = await issueAuthTokens(user);

  await invalidateCache("authMutation");

  return successResponse(res, {
    statusCode: 201,
    message: "User registered successfully",
    data: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      accessToken,
      refreshToken,
    },
  });
});

export const login = ErrorCatch(async (req: Request, res: Response) => {
  const { email, password } = req.body as { email: string; password: string };

  const user = await User.unscoped().findOne({ where: { email } });

  if (!user) {
    return errorResponse(res, {
      statusCode: 404,
      message: "User not found",
      code: ERROR_CODES.USER_NOT_FOUND,
      details: { email },
    });
  }

  if (!assertPassword(password, user.password)) {
    return errorResponse(res, {
      statusCode: 400,
      message: "Invalid email or password",
      code: ERROR_CODES.INVALID_CREDENTIALS,
    });
  }

  const { accessToken, refreshToken } = await issueAuthTokens(user);

  return successResponse(res, {
    message: "Login successful",
    data: {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    },
  });
});

export const refreshToken = ErrorCatch(async (req: Request, res: Response) => {
  const { refreshToken: token } = req.body as { refreshToken: string };

  const user = await User.unscoped().findOne({
    where: {
      refreshToken: hashValue(token),
      refreshTokenExpires: { [Op.gt]: new Date() },
    },
  });

  if (!user) {
    return errorResponse(res, {
      statusCode: 401,
      message: "Invalid or expired refresh token",
      code: ERROR_CODES.INVALID_REFRESH_TOKEN,
    });
  }

  const { accessToken, refreshToken: newRefreshToken } = await issueAuthTokens(user);

  return successResponse(res, {
    message: "Token refreshed successfully",
    data: {
      accessToken,
      refreshToken: newRefreshToken,
    },
  });
});

const passwordResetOtpEmail = ({ name, otp }: { name: string; otp: string }): string => `
  <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
    <h2>Password Reset</h2>
    <p>Hi ${name},</p>
    <p>Use the OTP below to reset your password. It expires in 10 minutes.</p>
    <p style="font-size: 28px; font-weight: bold; letter-spacing: 6px;">${otp}</p>
    <p>If you did not request this, you can ignore this email.</p>
  </div>
`;

export const forgetPassword = ErrorCatch(async (req: Request, res: Response) => {
  const { email } = req.body as { email: string };

  const user = await User.unscoped().findOne({ where: { email } });

  if (!user) {
    return errorResponse(res, {
      statusCode: 404,
      message: "User not found",
      code: ERROR_CODES.USER_NOT_FOUND,
      details: { email },
    });
  }

  const otp = crypto.randomInt(100000, 999999).toString();

  await user.update({
    resetPasswordOtp: hashValue(otp),
    resetPasswordOtpExpires: new Date(Date.now() + OTP_EXPIRY_MS),
  });

  const sent = await SendMail({
    to: user.email,
    subject: "Password reset OTP",
    html: passwordResetOtpEmail({ name: user.name, otp }),
  });

  if (!sent) {
    return errorResponse(res, {
      statusCode: 500,
      message: "Could not send OTP email",
      code: ERROR_CODES.EMAIL_SEND_FAILED,
    });
  }

  return successResponse(res, {
    message: "Password reset OTP sent successfully",
  });
});

export const resetPassword = ErrorCatch(async (req: Request, res: Response) => {
  const { email, otp, newPassword } = req.body as {
    email: string;
    otp: string;
    newPassword: string;
  };

  const user = await User.unscoped().findOne({ where: { email } });

  if (
    !user ||
    !user.resetPasswordOtp ||
    user.resetPasswordOtp !== hashValue(otp) ||
    !user.resetPasswordOtpExpires ||
    user.resetPasswordOtpExpires <= new Date()
  ) {
    return errorResponse(res, {
      statusCode: 400,
      message: "Invalid or expired OTP",
      code: ERROR_CODES.INVALID_OTP,
    });
  }

  await user.update({
    password: bcrypt.hashSync(newPassword, +(process.env.saltRound || 8)),
    resetPasswordOtp: null,
    resetPasswordOtpExpires: null,
    refreshToken: null,
    refreshTokenExpires: null,
  });

  await invalidateCache("authMutation");

  return successResponse(res, {
    message: "Password reset successfully",
  });
});

export const changePassword = ErrorCatch(async (req: Request, res: Response) => {
  const { oldPassword, newPassword } = req.body as {
    oldPassword: string;
    newPassword: string;
  };
  const user = req.user;

  if (!user) {
    return errorResponse(res, {
      statusCode: 401,
      message: "Not authorized",
      code: ERROR_CODES.UNAUTHORIZED,
    });
  }

  if (!assertPassword(oldPassword, user.password)) {
    return errorResponse(res, {
      statusCode: 400,
      message: "Invalid old password",
      code: ERROR_CODES.INVALID_PASSWORD,
    });
  }

  await user.update({
    password: bcrypt.hashSync(newPassword, +(process.env.saltRound || 8)),
    refreshToken: null,
    refreshTokenExpires: null,
  });

  await invalidateCache("authMutation");

  return successResponse(res, { message: "Password changed successfully" });
});

export const getMe = ErrorCatch(async (req: Request, res: Response) => {
  if (!req.user) {
    return errorResponse(res, {
      statusCode: 401,
      message: "Not authorized",
      code: ERROR_CODES.UNAUTHORIZED,
    });
  }

  const user = await User.findByPk(req.user.id);

  if (!user) {
    return errorResponse(res, {
      statusCode: 404,
      message: "User not found",
      code: ERROR_CODES.USER_NOT_FOUND,
    });
  }

  return successResponse(res, {
    message: "Profile fetched successfully",
    data: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
  });
});
