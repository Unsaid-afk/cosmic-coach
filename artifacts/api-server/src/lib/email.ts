import nodemailer from "nodemailer";
import { logger } from "./logger.js";

// Create a mock email transporter using Ethereal (https://ethereal.email/)
// In a production environment, you would use SendGrid, Postmark, AWS SES, etc.
let transporter: nodemailer.Transporter | null = null;

async function initTransporter() {
  if (transporter) return transporter;

  try {
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: testAccount.user, // generated ethereal user
        pass: testAccount.pass, // generated ethereal password
      },
    });
    return transporter;
  } catch (err) {
    logger.error({ err }, "Failed to initialize Ethereal email transporter");
    return null;
  }
}

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  const mailer = await initTransporter();
  if (!mailer) {
    logger.error("Email transporter not ready. Could not send email.");
    return;
  }

  try {
    const info = await mailer.sendMail({
      from: '"Closing Clarity" <noreply@closingclarity.com>',
      to,
      subject,
      html,
    });

    logger.info(`Message sent: ${info.messageId}`);
    
    // Ethereal provides a URL to preview the email exactly as it was sent
    const previewUrl = nodemailer.getTestMessageUrl(info);
    logger.info(`📧 Preview URL: ${previewUrl}`);
    
    return previewUrl;
  } catch (err) {
    logger.error({ err }, "Error sending email");
    throw err;
  }
}
