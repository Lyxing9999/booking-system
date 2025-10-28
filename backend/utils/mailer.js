import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const isProd = process.env.NODE_ENV === "production";

const transporter = nodemailer.createTransport({
  host: isProd ? process.env.MAIL_HOST_PROD : process.env.MAIL_HOST_DEV,
  port: Number(isProd ? process.env.MAIL_PORT_PROD : process.env.MAIL_PORT_DEV),
  secure: false, // use true for 465
  auth: {
    user: isProd ? process.env.MAIL_USER_PROD : process.env.MAIL_USER_DEV,
    pass: isProd ? process.env.MAIL_PASS_PROD : process.env.MAIL_PASS_DEV,
  },
});

transporter
  .verify()
  .then(() => console.log("✅ Mailer ready"))
  .catch((err) => console.warn("⚠️ Mailer verification failed:", err));

const mailFrom = isProd
  ? process.env.MAIL_FROM_PROD
  : process.env.MAIL_FROM_DEV;

export const sendBookingEmail = async (
  to,
  name,
  slotDate,
  slotTime,
  orderId = "",
  status = "Confirmed",
  message = ""
) => {
  const mailOptions = {
    from: mailFrom,
    to,
    subject: `Booking ${status} - ${slotDate} at ${slotTime}`,
    text: `Hi ${name},

${
  message ||
  `Your booking on ${slotDate} at ${slotTime} has been ${status.toLowerCase()}!`
}
Booking ID: ${orderId}

Thank you for using our service.

Booking System`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: ${status === "Confirmed" ? "#4CAF50" : "#f44336"};">
          Booking ${status}!
        </h2>
        <p>Hi <strong>${name}</strong>,</p>
        <p>${
          message ||
          `Your booking on <strong>${slotDate}</strong> at <strong>${slotTime}</strong> has been <span style="color: ${
            status === "Confirmed" ? "green" : "red"
          }; font-weight: bold;">${status.toLowerCase()}</span>.`
        }</p>
        <p><strong>Booking ID:</strong> ${orderId}</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p>Thank you for using our service.</p>
        <p style="font-size: 0.9em; color: #666;">Booking System</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Booking email sent to ${to} (status: ${status})`);
  } catch (err) {
    console.error(
      `⚠️ Failed to send booking email to ${to} (status: ${status}):`,
      err
    );
  }
};
