import { and, db, eq, otpTable } from "@repo/database";
import { hashFunction } from "./hashFuntion";

export const verifyOtp = async (email: string, otp: string) => {
  try {
    const hashOtp = hashFunction(otp);

    const [isOtpExist] = await db
      .select()
      .from(otpTable)
      .where(and(eq(otpTable.email, email), eq(otpTable.hashOtp, hashOtp)));

    if (!isOtpExist) {
      console.log({
        message: "invalid otp or email",
        number: "7",
      });
      return false;
    }
    console.log("4");
    const currentTime = new Date();
    if (currentTime > isOtpExist.expiresAt) {
      console.log({
        message: "otp is expired! please regenerate",
        number: "6",
      });
      return false;
    }
    console.log("3");
    // deleteting otp afetr evryting goes right.

    await db.delete(otpTable).where(eq(otpTable.email, email));
    console.log("5");
    return true;
  } catch (error) {
    console.log(error);
    return false;
  }
};
