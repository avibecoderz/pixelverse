/**
 * authController.js - Authentication Controller
 *
 * Handles all authentication logic for PixelStudio.
 * Both Admin and Staff are stored in the same `users` table.
 * The `role` field (ADMIN / STAFF) separates their permissions.
 */

const bcrypt                  = require("bcryptjs");
const crypto                  = require("crypto");
const prisma                  = require("../utils/prismaClient");
const { signToken }           = require("../utils/jwtUtils");
const { success, error }      = require("../utils/responseUtils");
const { sendPasswordResetOtp } = require("../utils/mailer");

const OTP_TTL_MINUTES         = 10;
const RESET_TOKEN_TTL_MINUTES = 15;
const OTP_RESEND_COOLDOWN_MS  = 60 * 1000;
const MAX_OTP_ATTEMPTS        = 5;

const toDbRole = (role) => {
  if (role === "admin") return "ADMIN";
  if (role === "staff") return "STAFF";
  return null;
};

const formatUser = (user) => ({
  id:        user.id,
  name:      user.name,
  email:     user.email,
  phone:     user.phone,
  role:      user.role.toLowerCase(),
  isActive:  user.isActive,
  createdAt: user.createdAt || null,
});

const hashValue = (value) =>
  crypto.createHash("sha256").update(String(value)).digest("hex");

const generateOtp = () =>
  String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");

const generateResetToken = () =>
  crypto.randomBytes(32).toString("hex");

const login = async (req, res, next) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      return error(res, "email, password, and role are required", 400);
    }

    const dbRole = toDbRole(role);
    if (!dbRole) {
      return error(res, "role must be 'admin' or 'staff'", 400);
    }

    const user = await prisma.user.findFirst({
      where: {
        email:    email.toLowerCase().trim(),
        role:     dbRole,
        isActive: true,
      },
    });

    if (!user) {
      return error(res, "Invalid email or password", 401);
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return error(res, "Invalid email or password", 401);
    }

    const token = signToken({ id: user.id, role });

    return success(res, "Login successful", {
      token,
      user: formatUser(user),
    });
  } catch (err) {
    next(err);
  }
};

const getMe = async (req, res, next) => {
  try {
    const { id } = req.user;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id:        true,
        name:      true,
        email:     true,
        phone:     true,
        role:      true,
        isActive:  true,
        createdAt: true,
      },
    });

    if (!user) {
      return error(res, "User account no longer exists. Please log in again.", 401);
    }

    if (!user.isActive) {
      return error(res, "Your account has been deactivated. Contact the admin.", 403);
    }

    return success(res, "User profile fetched", formatUser(user));
  } catch (err) {
    next(err);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const { id } = req.user;

    const currentTrimmed = (currentPassword || "").trim();
    const newTrimmed     = (newPassword || "").trim();

    if (!currentTrimmed || !newTrimmed) {
      return error(res, "currentPassword and newPassword are required", 400);
    }
    if (newTrimmed.length < 6) {
      return error(res, "New password must be at least 6 characters", 400);
    }
    if (currentTrimmed === newTrimmed) {
      return error(res, "New password must be different from the current password", 400);
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return error(res, "User not found", 404);

    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) return error(res, "Current password is incorrect", 401);

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id },
      data:  { password: hashed },
    });

    return success(res, "Password changed successfully");
  } catch (err) {
    next(err);
  }
};

const requestPasswordReset = async (req, res, next) => {
  try {
    const email = (req.body.email || "").trim().toLowerCase();

    const user = await prisma.user.findFirst({
      where: { email, isActive: true },
      select: {
        id:    true,
        name:  true,
        email: true,
        passwordReset: {
          select: {
            lastSentAt: true,
          },
        },
      },
    });

    if (!user) {
      return success(
        res,
        "If that email is registered, a verification code has been sent.",
        { expiresInMinutes: OTP_TTL_MINUTES }
      );
    }

    if (
      user.passwordReset &&
      Date.now() - new Date(user.passwordReset.lastSentAt).getTime() < OTP_RESEND_COOLDOWN_MS
    ) {
      return success(
        res,
        "If that email is registered, a verification code has been sent.",
        { expiresInMinutes: OTP_TTL_MINUTES }
      );
    }

    const otp          = generateOtp();
    const otpHash      = hashValue(otp);
    const otpExpiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
    const delivery     = await sendPasswordResetOtp({
      email:            user.email,
      name:             user.name,
      otp,
      expiresInMinutes: OTP_TTL_MINUTES,
    });

    await prisma.passwordResetSession.upsert({
      where: { userId: user.id },
      update: {
        otpHash,
        otpExpiresAt,
        attemptCount:        0,
        lastSentAt:          new Date(),
        verifiedAt:          null,
        resetTokenHash:      null,
        resetTokenExpiresAt: null,
        consumedAt:          null,
      },
      create: {
        userId: user.id,
        otpHash,
        otpExpiresAt,
        lastSentAt: new Date(),
      },
    });

    const data = {
      delivery:         delivery.delivery,
      expiresInMinutes: OTP_TTL_MINUTES,
    };

    if (delivery.previewCode) {
      data.previewCode = delivery.previewCode;
    }

    return success(
      res,
      "If that email is registered, a verification code has been sent.",
      data
    );
  } catch (err) {
    next(err);
  }
};

const verifyPasswordResetOtp = async (req, res, next) => {
  try {
    const email = (req.body.email || "").trim().toLowerCase();
    const otp   = (req.body.otp || "").trim();

    const user = await prisma.user.findFirst({
      where: { email, isActive: true },
      select: {
        id: true,
        passwordReset: {
          select: {
            otpHash:             true,
            otpExpiresAt:        true,
            attemptCount:        true,
            verifiedAt:          true,
            consumedAt:          true,
            resetTokenHash:      true,
            resetTokenExpiresAt: true,
          },
        },
      },
    });

    if (!user || !user.passwordReset) {
      return error(res, "Invalid or expired verification code", 401);
    }

    const session = user.passwordReset;

    if (session.consumedAt || session.verifiedAt) {
      return error(res, "This verification code has already been used", 400);
    }

    if (session.attemptCount >= MAX_OTP_ATTEMPTS) {
      return error(res, "Too many incorrect attempts. Request a new code.", 429);
    }

    if (new Date(session.otpExpiresAt).getTime() < Date.now()) {
      return error(res, "Verification code has expired. Request a new one.", 401);
    }

    if (hashValue(otp) !== session.otpHash) {
      await prisma.passwordResetSession.update({
        where: { userId: user.id },
        data:  { attemptCount: { increment: 1 } },
      });
      return error(res, "Invalid or expired verification code", 401);
    }

    const resetToken          = generateResetToken();
    const resetTokenHash      = hashValue(resetToken);
    const resetTokenExpiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000);

    await prisma.passwordResetSession.update({
      where: { userId: user.id },
      data: {
        verifiedAt:          new Date(),
        resetTokenHash,
        resetTokenExpiresAt,
      },
    });

    return success(res, "Verification successful.", {
      resetToken,
      expiresInMinutes: RESET_TOKEN_TTL_MINUTES,
    });
  } catch (err) {
    next(err);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { email, newPassword, resetToken } = req.body;

    const emailTrimmed = (email || "").trim().toLowerCase();
    const newTrimmed   = (newPassword || "").trim();
    const resetTrimmed = (resetToken || "").trim();

    if (!emailTrimmed || !newTrimmed || !resetTrimmed) {
      return error(res, "email, newPassword, and resetToken are required", 400);
    }
    if (newTrimmed.length < 6) {
      return error(res, "New password must be at least 6 characters", 400);
    }

    const user = await prisma.user.findFirst({
      where: { email: emailTrimmed, isActive: true },
      select: {
        id: true,
        passwordReset: {
          select: {
            verifiedAt:          true,
            resetTokenHash:      true,
            resetTokenExpiresAt: true,
            consumedAt:          true,
          },
        },
      },
    });

    if (!user || !user.passwordReset) {
      return error(res, "Password reset session is invalid or expired", 401);
    }

    const session = user.passwordReset;

    if (!session.verifiedAt || session.consumedAt) {
      return error(res, "Password reset session is invalid or expired", 401);
    }

    if (!session.resetTokenHash || !session.resetTokenExpiresAt) {
      return error(res, "Password reset session is invalid or expired", 401);
    }

    if (new Date(session.resetTokenExpiresAt).getTime() < Date.now()) {
      return error(res, "Password reset session has expired. Request a new code.", 401);
    }

    if (hashValue(resetTrimmed) !== session.resetTokenHash) {
      return error(res, "Password reset session is invalid or expired", 401);
    }

    const hashed = await bcrypt.hash(newTrimmed, 10);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data:  { password: hashed },
      }),
      prisma.passwordResetSession.update({
        where: { userId: user.id },
        data:  { consumedAt: new Date() },
      }),
    ]);

    return success(res, "Password reset successfully.");
  } catch (err) {
    next(err);
  }
};

module.exports = {
  login,
  getMe,
  changePassword,
  requestPasswordReset,
  verifyPasswordResetOtp,
  resetPassword,
};
