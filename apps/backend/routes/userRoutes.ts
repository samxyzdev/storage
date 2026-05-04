import { Router } from "express";
import {
  and,
  asc,
  db,
  eq,
  foldersTable,
  otpTable,
  sessionTable,
  usersTable,
} from "@repo/database";
import { SigninSchema, SignupSchema } from "@repo/zod";
import bcrypt from "bcrypt";
import crypto from "crypto";

export const userRoutes: Router = Router();

userRoutes.post("/signup", async (req, res, next) => {
  // name , emai, password, otp
  console.log("0 object");
  const { success, data, error } = SignupSchema.safeParse(req.body);
  if (!success) {
    return res.status(400).json({
      error: error.flatten().fieldErrors,
    });
  }
  console.log("1");

  const { name, email, otp, password } = data;

  const [createUser] = await db
    .select()
    .from(otpTable)
    .where(eq(otpTable.email, email));

  console.log("2");

  if (!createUser) {
    return res.status(400).json({
      message: "1 invalid otp",
    });
  }

  const currentTime = new Date();

  if (currentTime > createUser.expiresAt) {
    return res.status(400).json({
      message: "otp is expired! please regenerate",
    });
  }
  console.log("3");
  const hashOtp = crypto.createHash("sha256").update(otp).digest("hex");

  const [isOtpExist] = await db
    .select()
    .from(otpTable)
    .where(and(eq(otpTable.email, email), eq(otpTable.hashOtp, hashOtp)));
  console.log("4");
  if (!isOtpExist) {
    return res.status(400).json({
      message: "invalid otp or email",
    });
  }

  // deleteting otp afetr evryting goes right.
  await db.delete(otpTable).where(eq(otpTable.email, email));
  console.log("5");

  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    await db.transaction(async (tx) => {
      const [createUser] = await tx
        .insert(usersTable)
        .values({ name, email, password: hashedPassword })
        .returning({ insertedId: usersTable.id });

      console.log("transatioun 1 completed");

      if (!createUser) {
        // return res.status(500).json({
        //   message: "1 server error",
        // });
        // taki drizle transaction failed hone pe drizzle rollback kare.
        throw new Error("User_Failed");
      }

      const uniqueFolderName = crypto.randomUUID();

      const [createFolder] = await tx
        .insert(foldersTable)
        .values({
          folderName: "root",
          uniqueFolderName,
          userId: createUser.insertedId,
          parentId: null,
        })
        .returning({ insertedId: foldersTable.id });

      if (!createFolder) {
        // return res.status(500).json({
        //   message: "2 server error",
        // }); // catchm main rakho is logic ko.
        throw new Error("Folder_Failed");
      }
      // 2. Agar code yahan tak pahunch gaya, matlab transaction SUCCESS (Commit) ho gaya
      return res.status(201).json({
        success: true,
        message: "User and root folder created successfully!",
      });
    });
  } catch (error: any) {
    console.log(error);
    if (error.message === "User_Failed") {
      return res.status(500).json({
        message: "1 server error (user creation failed",
      });
    }
    if (error.message === "Folder_Failed") {
      return res.status(500).json({
        message: "2 servver error (folder cration filed)",
      });
    }
    next(error);
  }
});

userRoutes.post("/signin", async (req, res) => {
  const { success, data, error } = SigninSchema.safeParse(req.body);

  if (!success) {
    return res.status(400).json({
      error,
    });
  }

  console.log("signin 1");

  const { email, password } = data;
  // email bhi compare ho gayi hai.
  const [isUserExist] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email));

  console.log("signin 2");

  if (!isUserExist) {
    return res.status(400).json({
      message: "user doesn't exist",
    });
  }
  console.log("signin 3");
  // password compare karna hai.
  const isPassworValid = await bcrypt.compare(password, isUserExist.password);
  console.log("signin 4");

  if (!isPassworValid) {
    return res.status(400).json({
      message: "invalid credentials",
    });
  }
  console.log("signin 5");
  // sesion check 2 se jayad ho to old wale ko delete kar do
  const sessions = await db
    .select()
    .from(sessionTable)
    .where(eq(sessionTable.userId, isUserExist.id))
    .orderBy(asc(sessionTable.createdAt));
  console.log("Session", sessions);
  console.log(sessions.length);

  console.log("signin 6");

  if (sessions.length >= 2) {
    console.log("inside if of length");
    const oldestSession = sessions[0];

    if (!oldestSession) return;
    console.log("after oldestSession return");
    const result = await db
      .delete(sessionTable)
      .where(eq(sessionTable.id, oldestSession.id));
    console.log(result);
  }

  console.log("signi 7");
  const token = crypto.randomBytes(32).toString("hex");
  // bcrypt isliye use nahi kar rhe taki fast rahe.
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  console.log("signin 7");

  try {
    const createSession = await db
      .insert(sessionTable)
      .values({ userId: isUserExist.id, token: hashedToken, expiresAt })
      .returning({ insertedId: sessionTable.id });
    console.log("create session", createSession);
  } catch (error) {
    console.log("create session error", error);
  }

  // if (!createSession) {
  //   return res.status(500).json({
  //     message: "5 Something went wrong",
  //   });
  // }
  // console.log("signin 9");

  res.cookie("sid", token, {
    httpOnly: true,
    secure: true,
    signed: true, // required for signedCookie .
    sameSite: "lax",
    expires: expiresAt,
  });
  console.log("signin 10");

  return res.status(200).json({
    message: "User signed successfully",
  });
});
