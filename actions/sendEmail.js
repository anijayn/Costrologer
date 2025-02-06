import { Resend } from "resend";

export const sendEmail = async ({ to, subject, react }) => {
  console.log("HERE");
  const resend = new Resend(process.env.RESEND_API_KEY || "");
  try {
    const data = await resend.emails.send({
      from: "Costrologer App <onboarding@resend.dev>",
      to,
      subject,
      react,
    });
    return { success: true, data };
  } catch (error) {
    console.error("Failed to send email: ", error);
    return { success: false, error };
  }
};
