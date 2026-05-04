import { and, db, eq, otpTable } from "@repo/database";
import { SignupSchema } from "@repo/zod";
import { Router } from "express";
import crypto from "node:crypto";

const GenerateOtpSchema = SignupSchema.pick({
  email: true,
});

export const otpRoutes: Router = Router();

otpRoutes.post("/generate-otp", async (req, res, next) => {
  // email to chahiye.
  // send generated otp to maill
  const { success, data, error } = GenerateOtpSchema.safeParse(req.body);

  if (!success) {
    return res.status(400).json({
      error: error.flatten().fieldErrors,
    });
  }

  const { email } = data;

  const randomOtp = Math.floor(Math.random() * 900000 + 100000).toString();

  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min

  console.log("Genearet OTP" + randomOtp);
  // sendEmail
  // agar yahan se mujhe perfect message aata hai tabhi db main otp ko ahsh kakre save karunga wran nahi
  const hashOtp = crypto.createHash("sha256").update(randomOtp).digest("hex");
  console.log(`hash otp ${hashOtp}`);

  try {
    const isOtpCreated = await db
      .insert(otpTable)
      .values({ email, hashOtp, expiresAt })
      .returning({ indertedId: otpTable.id });

    console.log(`isOtpCreated ${isOtpCreated}`);
  } catch (error) {
    console.log(error);
  }

  // if (!isOtpCreated) {
  //   return res.status(400).json({
  //     message: "Something went wrong Please generate it again",
  //   });
  // }

  return res.status(200).json({
    message: "Otp send successfully",
  });
});

// const VerifyOtpSchema = SignupSchema.pick({
//   email: true,
//   otp: true,
// });

// otpRoutes.post("/verify-otp", async (req, res, next) => {
//   // otp and email,
//   const { success, data, error } = VerifyOtpSchema.safeParse(req.body);

//   if (!success) {
//     return res.status(400).json({
//       message: "invalide credentials",
//     });
//   }

//   const { email, otp } = data;

//   const hashOtp = crypto.createHash("sha256").update(otp).digest("hex");

//   const [isOtpExist] = await db
//     .select()
//     .from(otpTable)
//     .where(and(eq(otpTable.email, email), eq(otpTable.hashOtp, hashOtp)));

//   if (!isOtpExist) {
//     return res.status(400).json({
//       message: "invalid otp or email",
//     });
//   }
//   return res.status(200).json({
//     message: "otp verified",
//   });
// });
