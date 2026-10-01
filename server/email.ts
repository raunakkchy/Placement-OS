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
  // Display strictly as "Placement OS"
  const from = process.env.MAIL_FROM?.trim() || (smtpUser ? `"Placement OS" <${smtpUser}>` : "Placement OS <noreply@placementos.com>");
  const replyTo = smtpUser || from;

  const subject = "Verify Your Email - Placement OS Password Reset OTP";

  const textContent = `Placement OS Password Reset\n\nYour 6-digit verification code is: ${otp}\n\nThis OTP is valid for 5 minutes.\nIf you did not request a password reset, please ignore this email. Do not share this OTP with anyone.`;

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email - Placement OS Password Reset OTP</title>
</head>
<body style="margin: 0; padding: 32px 16px; background-color: #f4f5f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 520px; margin: 0 auto;">
    <tr>
      <td style="background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 36px 32px 28px 32px; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
        <!-- Logo / Title -->
        <div style="font-size: 20px; font-weight: 800; color: #0f172a; letter-spacing: -0.3px; margin-bottom: 24px;">
          Placement OS
        </div>

        <h1 style="font-size: 22px; font-weight: 700; color: #0f172a; margin: 0 0 16px 0; letter-spacing: -0.3px;">
          Reset Your Password
        </h1>

        <p style="font-size: 15px; color: #475569; line-height: 1.6; margin: 0 0 28px 0;">
          Here is your 6-digit verification code to reset your Placement OS account password:
        </p>

        <!-- OTP Box -->
        <div style="background-color: #f1f5f9; border-radius: 12px; padding: 24px; text-align: center; margin: 0 0 28px 0;">
          <div style="font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 800; letter-spacing: 10px; color: #1e3a8a; display: inline-block;">
            ${otp}
          </div>
          <div style="font-size: 13px; font-weight: 500; color: #64748b; margin-top: 10px;">
            This OTP is valid for 5 minutes
          </div>
        </div>

        <p style="font-size: 13.5px; color: #64748b; line-height: 1.5; margin: 0 0 24px 0;">
          If you did not request a password reset, you can safely ignore this email. Do not share this OTP with anyone.
        </p>

        <div style="border-top: 1px solid #f1f5f9; padding-top: 20px; margin-top: 20px; font-size: 12.5px; color: #94a3b8; line-height: 1.5;">
          This is an automated security transmission. Placement OS administrators will never ask for your verification code.
        </div>
      </td>
    </tr>
    <tr>
      <td style="padding-top: 20px; text-align: center; font-size: 12px; color: #94a3b8;">
        &copy; 2026 Placement OS. All rights reserved.
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
  // Display strictly as "Placement OS"
  const from = process.env.MAIL_FROM?.trim() || (smtpUser ? `"Placement OS" <${smtpUser}>` : "Placement OS <noreply@placementos.com>");
  const replyTo = smtpUser || from;

  const displayName = studentName?.trim() || "Student";
  const subject = "Verify Your Email - Placement OS Student Registration OTP";

  const textContent = `Hello ${displayName},\n\nWelcome to Placement OS! Enter the 6-digit verification code below to verify your email address and activate your student account:\n\n${otp}\n\nThis OTP is valid for 5 minutes.\n\nIf you did not attempt to register on Placement OS, you can safely ignore this email. Do not share this OTP with anyone.`;

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email - Placement OS Student Registration OTP</title>
</head>
<body style="margin: 0; padding: 32px 16px; background-color: #f4f5f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 520px; margin: 0 auto;">
    <tr>
      <td style="background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 36px 32px 28px 32px; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
        <!-- Logo / Title -->
        <div style="font-size: 20px; font-weight: 800; color: #0f172a; letter-spacing: -0.3px; margin-bottom: 24px;">
          Placement OS
        </div>

        <h1 style="font-size: 22px; font-weight: 700; color: #0f172a; margin: 0 0 16px 0; letter-spacing: -0.3px;">
          Verify Your Email Address
        </h1>

        <p style="font-size: 15px; color: #475569; line-height: 1.6; margin: 0 0 28px 0;">
          Hello ${displayName}, Welcome to Placement OS! Enter the 6-digit verification code below to verify your email address and activate your student account:
        </p>

        <!-- OTP Box -->
        <div style="background-color: #f1f5f9; border-radius: 12px; padding: 24px; text-align: center; margin: 0 0 28px 0;">
          <div style="font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 800; letter-spacing: 10px; color: #1e3a8a; display: inline-block;">
            ${otp}
          </div>
          <div style="font-size: 13px; font-weight: 500; color: #64748b; margin-top: 10px;">
            This OTP is valid for 5 minutes
          </div>
        </div>

        <p style="font-size: 13.5px; color: #64748b; line-height: 1.5; margin: 0 0 24px 0;">
          If you did not attempt to register on Placement OS, you can safely ignore this email. Do not share this OTP with anyone.
        </p>

        <div style="border-top: 1px solid #f1f5f9; padding-top: 20px; margin-top: 20px; font-size: 12.5px; color: #94a3b8; line-height: 1.5;">
          This is an automated security transmission. Placement OS administrators will never ask for your verification code.
        </div>
      </td>
    </tr>
    <tr>
      <td style="padding-top: 20px; text-align: center; font-size: 12px; color: #94a3b8;">
        &copy; 2026 Placement OS. All rights reserved.
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
      `[Email Service] Simulated registration OTP stored for ${maskEmail(to)}.`
    );
    return true;
  }
}
