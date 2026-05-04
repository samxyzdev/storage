import * as z from "zod";

export const SignupSchema = z.object({
  name: z.string().min(3, "Too short").max(25),
  email: z.email().min(3, "Too short").max(25),
  password: z.string().min(8).max(30),
  otp: z.string().min(6).max(6),
});

export const SigninSchema = z.object({
  email: z.email().min(3, "Too short").max(25),
  password: z.string().min(8).max(30),
});
