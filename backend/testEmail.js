import { sendBookingEmail } from "./utils/mailer.js";
const test = async () => {
  try {
    await sendBookingEmail(
      "kaingbunly9999@gmail.com", // replace with a real email you can check
      "Test User",
      "2025-10-28",
      "15:00",
      "TEST123",
      "Confirmed",
      "This is a test email from your booking system."
    );
    console.log("Test email sent successfully!");
  } catch (err) {
    console.error("Error sending test email:", err.message);
  }
};

test();
