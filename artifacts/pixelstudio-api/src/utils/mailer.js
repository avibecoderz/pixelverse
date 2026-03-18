"use strict";

const nodemailer = require("nodemailer");

const toBool = (value) => String(value).toLowerCase() === "true";

const smtpConfigured = () =>
  Boolean(
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS &&
    process.env.SMTP_FROM
  );

const createTransport = () =>
  nodemailer.createTransport({
    host:   process.env.SMTP_HOST,
    port:   Number(process.env.SMTP_PORT),
    secure: toBool(process.env.SMTP_SECURE),
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

const sendPasswordResetOtp = async ({ email, name, otp, expiresInMinutes }) => {
  if (!smtpConfigured()) {
    console.log(`[Password Reset OTP] ${email} -> ${otp} (expires in ${expiresInMinutes} minutes)`);
    return {
      delivery:    "log",
      previewCode: process.env.NODE_ENV === "production" ? undefined : otp,
    };
  }

  const transporter = createTransport();
  const studioName  = process.env.STUDIO_NAME || "PixelStudio";

  await transporter.sendMail({
    from:    process.env.SMTP_FROM,
    to:      email,
    subject: `${studioName} password reset code`,
    text: [
      `Hello ${name || "there"},`,
      "",
      `Your password reset code is ${otp}.`,
      `It expires in ${expiresInMinutes} minutes.`,
      "",
      "If you did not request this, you can ignore this email.",
    ].join("\n"),
  });

  return { delivery: "email" };
};

module.exports = { sendPasswordResetOtp, smtpConfigured };
