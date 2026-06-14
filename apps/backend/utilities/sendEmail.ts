import { Resend } from "resend";

export const sendEmail = (email: string, otp: string) => {
  const resend = new Resend(process.env.RESEND_EMAIL_API!);

  resend.emails.send({
    from: "onboarding@resend.dev",
    to: `${email}`,
    subject: "Otp To verify",
    html: `<h2>Your Otp is<strong>${otp}</strong>!</h2>`,
  });
};
