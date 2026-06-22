import {  db,  otpTable } from "@repo/database";
import { SignupSchema, z } from "@repo/zod";
import { Router } from "express";
import { generateOtp } from "../utilities/generateRandomOtp";
import { hashFunction } from "../utilities/hashFuntion";
import { sendEmail } from "../utilities/sendEmail";

const GenerateOtpSchema = SignupSchema.pick({
  email: true,
});

export const otpRoutes: Router = Router();

otpRoutes.post("/generate-otp", async (req, res, next) => {
  // email to chahiye.
  // send generated otp to maill
  console.log("lk;dasjf;alksjf;lskajd")
  const { success, data, error } = GenerateOtpSchema.safeParse(req.body);
  if (!success) {
    return res.status(400).json({
      error: z.flattenError(error),
      number: "1",
    });
  }
  const { email } = data;
  const randomOtp = generateOtp(6);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min
  console.log("Genearet OTP" + randomOtp);
  // sendEmail, agar yahan se mujhe perfect message aata hai tabhi db main otp ko ahsh kakre save karunga wran nahi
  sendEmail(email, randomOtp);
  // const hashOtp = crypto.createHash("sha256").update(randomOtp).digest("hex");
  const hashOtp = hashFunction(randomOtp);
  console.log(`hash otp ${hashOtp}`);
  try {
    await db
      .insert(otpTable)
      .values({ email, hashOtp, expiresAt })
      .returning({ indertedId: otpTable.id });
  } catch (error) {
    console.log("otp not save in otpTable");
    console.log(error);
    return res.status(400).json({
      message: "Something went wrong Please generate it again",
      number: "2",
    });
  }
  return res.status(200).json({
    message: "Otp send successfully",
    number: "3",
  });
});
