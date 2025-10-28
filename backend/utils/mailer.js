// utils/email.js
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config({ path: "./backend/.env" });

let transporter;

try {
  transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: Number(process.env.MAIL_PORT),
    secure: false,
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });

  transporter
    .verify()
    .then(() => console.log("✅ Mailer ready"))
    .catch((err) => console.warn("⚠️ Mailer verification failed:", err));
} catch (err) {
  console.warn("⚠️ Failed to create transporter:", err);
}

/**
 * Send a booking email (fails silently in production)
 */
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
    from: process.env.MAIL_FROM || '"Booking System" <noreply@booking.com>',
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
    console.warn(
      `⚠️ Failed to send booking email to ${to} (status: ${status}):`,
      err
    );
  }
};
