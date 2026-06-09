import nodemailer, { type Transporter } from "nodemailer";

import { logger } from "./logger.js";

interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
}

let transporter: Transporter | null = null;

const getTransporter = (): Transporter | null => {
  if (!process.env.Email || !process.env.Emailpassword) {
    return null;
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.Email,
        pass: process.env.Emailpassword,
      },
    });
  }

  return transporter;
};

export const SendMail = async ({ to, subject, html }: SendMailOptions): Promise<boolean> => {
  const mailer = getTransporter();

  if (!mailer) {
    logger.error("Email is not configured. Set Email and Emailpassword in .env");
    return false;
  }

  try {
    const result = await mailer.sendMail({
      from: process.env.Email,
      to,
      subject,
      html,
    });

    return result.accepted.length > 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({ error: message }, "Failed to send email");
    return false;
  }
};
