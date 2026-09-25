import nodemailer, { Transporter } from "nodemailer";

interface SendOtpEmailParams {
  to: string;
  otp: string;
}

let transporter: Transporter | null = null;

function getMailTransporter(): Transporter | null {
  const host = process.env.SMTP_HOST?.trim();
  const service = process.env.SMTP_SERVICE?.trim()?.toLowerCase();
  const user = process.env.SMTP_USER?.trim();
  const rawPass = process.env.SMTP_PASSWORD?.trim();
  // Strip whitespace from passwords (Google App Passwords are shown in 4x4 chunks with spaces)
  const pass = rawPass?.replace(/\s+/g, "");

  // If user provided a Gmail address or service="gmail"
  const isGmail = service === "gmail" || host === "smtp.gmail.com" || (user && user.toLowerCase().endsWith("@gmail.com"));

  if (!host && !isGmail) {
    return null;
  }

  if (!transporter) {
    if (isGmail && (!host || host === "smtp.gmail.com")) {
      transporter = nodemailer.createTransport({
        service: "gmail",
        auth: user ? { user, pass } : undefined,
      });
    } else {
      const port = Number(process.env.SMTP_PORT?.trim()) || 587;
      transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: user ? { user, pass } : undefined,
        tls: {
          rejectUnauthorized: false,
        },
      });
    }
  }

  return transporter;
}

function maskEmail(email: string): string {
  const parts = email.split("@");
  if (parts.length !== 2) return "***";
  const name = parts[0];
  const domain = parts[1];
  const maskedName =
    name.length <= 2
      ? name[0] + "*"
      : name[0] + "*".repeat(name.length - 2) + name[name.length - 1];
  return `${maskedName}@${domain}`;
}

export async function sendOtpEmail({ to, otp }: SendOtpEmailParams): Promise<boolean> {
  const mailTransporter = getMailTransporter();
  const smtpUser = process.env.SMTP_USER?.trim() || "";
  // Use "Raunak Kumar (Placement OS)" so Gmail doesn't flag mismatched identity
  const from = process.env.MAIL_FROM?.trim() || (smtpUser ? `Raunak Kumar (Placement OS) <${smtpUser}>` : "Placement OS <noreply@placementos.com>");
  const replyTo = smtpUser || from;

  const subject = `${otp} is your Placement OS verification code`;

  const textContent = `Placement OS Password Reset\n\nYour verification code is: ${otp}\n\nThis code will expire in 5 minutes.\nIf you did not request this password reset, please ignore this email.`;

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${otp} is your Placement OS verification code</title>
</head>
<body style="margin: 0; padding: 24px 12px; background-color: #f7f7f8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #111827;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e5e7eb; overflow: hidden;">
    <tr>
      <td style="padding: 32px 28px 24px 28px; text-align: left;">
        <div style="font-size: 19px; font-weight: 700; color: #111827; letter-spacing: -0.3px; margin-bottom: 20px;">
          Placement OS
        </div>
        <h1 style="font-size: 20px; font-weight: 600; color: #111827; margin: 0 0 12px 0;">Password Reset Code</h1>
        <p style="font-size: 15px; color: #4b5563; line-height: 1.5; margin: 0 0 24px 0;">
          Here is your 6-digit verification code to reset your account password:
        </p>
        <div style="background-color: #f3f4f6; border-radius: 10px; padding: 20px; text-align: center; margin: 0 0 24px 0;">
          <span style="font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 700; letter-spacing: 8px; color: #111827; display: inline-block;">${otp}</span>
          <div style="font-size: 13px; color: #6b7280; margin-top: 8px;">Valid for 5 minutes</div>
        </div>
        <p style="font-size: 13px; color: #6b7280; line-height: 1.5; margin: 0;">
          If you did not request a password reset, you can safely ignore this email.
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding: 16px 28px; background-color: #fafafa; border-top: 1px solid #f3f4f6; text-align: center; font-size: 12px; color: #9ca3af;">
        Placement OS &bull; Automated Verification
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  if (mailTransporter) {
    try {
      await mailTransporter.sendMail({
        from,
        to,
        replyTo,
        subject,
        text: textContent,
        html: htmlContent,
      });
      console.log(`[Email Service] Real SMTP email sent to ${maskEmail(to)}`);
      return true;
    } catch (err: any) {
      console.error(`[Email Service] Failed to send email to ${maskEmail(to)} via SMTP:`, err.message);
      return false;
    }
  } else {
    console.warn(
      `[Email Service] SMTP is not configured. Simulated OTP was securely generated for ${maskEmail(to)}.`
    );
    return true;
  }
}

export async function sendRegistrationOtpEmail({
  to,
  otp,
  studentName,
}: {
  to: string;
  otp: string;
  studentName?: string;
}): Promise<boolean> {
  const mailTransporter = getMailTransporter();
  const smtpUser = process.env.SMTP_USER?.trim() || "";
  // Use "Raunak Kumar (Placement OS)" so Gmail doesn't flag mismatched identity
  const from = process.env.MAIL_FROM?.trim() || (smtpUser ? `Raunak Kumar (Placement OS) <${smtpUser}>` : "Placement OS <noreply@placementos.com>");
  const replyTo = smtpUser || from;

  const greeting = studentName?.trim() ? `Hello ${studentName.trim()},` : "Hello,";
  const subject = `${otp} is your Placement OS verification code`;

  const textContent = `${greeting}\n\nYour Placement OS student account verification code is: ${otp}\n\nThis code will expire in 5 minutes.\nPlease enter it on the registration screen to complete your account setup.\n\nIf you did not attempt to register, please ignore this email.`;

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${otp} is your Placement OS verification code</title>
</head>
<body style="margin: 0; padding: 24px 12px; background-color: #f7f7f8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #111827;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e5e7eb; overflow: hidden;">
    <tr>
      <td style="padding: 32px 28px 24px 28px; text-align: left;">
        <div style="font-size: 19px; font-weight: 700; color: #111827; letter-spacing: -0.3px; margin-bottom: 20px;">
          Placement OS
        </div>
        <h1 style="font-size: 20px; font-weight: 600; color: #111827; margin: 0 0 12px 0;">Verify your email address</h1>
        <p style="font-size: 15px; color: #4b5563; line-height: 1.5; margin: 0 0 20px 0;">
          ${greeting} welcome to Placement OS! Please use the following code to confirm your email and activate your student account:
        </p>
        <div style="background-color: #f3f4f6; border-radius: 10px; padding: 20px; text-align: center; margin: 0 0 24px 0;">
          <span style="font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 700; letter-spacing: 8px; color: #111827; display: inline-block;">${otp}</span>
          <div style="font-size: 13px; color: #6b7280; margin-top: 8px;">Valid for 5 minutes</div>
        </div>
        <p style="font-size: 13px; color: #6b7280; line-height: 1.5; margin: 0;">
          If you didn't create an account with Placement OS, you can safely ignore this message.
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding: 16px 28px; background-color: #fafafa; border-top: 1px solid #f3f4f6; text-align: center; font-size: 12px; color: #9ca3af;">
        Placement OS &bull; Student Career Readiness System
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  if (mailTransporter) {
    try {
      await mailTransporter.sendMail({
        from,
        to,
        replyTo,
        subject,
        text: textContent,
        html: htmlContent,
      });
      console.log(`[Email Service] Real registration OTP sent to ${maskEmail(to)}`);
      return true;
    } catch (err: any) {
      console.error(`[Email Service] Failed to send registration email to ${maskEmail(to)} via SMTP:`, err.message);
      return false;
    }
  } else {
    console.warn(
      `[Email Service] SMTP is not configured. Simulated registration OTP was securely stored for ${maskEmail(to)}.`
    );
    return true;
  }
}
