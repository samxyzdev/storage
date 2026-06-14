import {
  Router,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import {
  and,
  asc,
  ConsoleLogWriter,
  db,
  eq,
  foldersTable,
  otpTable,
  sessionTable,
  usersTable,
} from "@repo/database";
import { SigninSchema, SignupSchema } from "@repo/zod";
import bcrypt from "bcrypt";
import crypto, { hash, verify } from "crypto";
import { checkAuth } from "../middleware/checkAuth";
import { hashFunction } from "../utilities/hashFuntion";
import { verifyOtp } from "../utilities/verifytOtp";

export const userRoutes: Router = Router();

userRoutes.post("/signup", async (req, res, next) => {
  // name , email, password, otp
  console.log("0 object");
  const { success, data, error } = SignupSchema.safeParse(req.body);
  if (!success) {
    return res.status(400).json({
      error,
      number: "4",
    });
  }
  console.log("1");

  const { name, email, otp, password } = data;
  // OTP
  const isOtpValid = verifyOtp(email, otp);
  if (!isOtpValid) {
    return res.status(500).json({
      error: "otp or email not valid",
    });
  }

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
        number: "8",
      });
    });
  } catch (error: any) {
    console.log(error);
    if (error.message === "User_Failed") {
      return res.status(500).json({
        message: "1 server error (user creation failed",
        number: "9",
      });
    }
    if (error.message === "Folder_Failed") {
      return res.status(500).json({
        message: "2 servver error (folder cration filed)",
        number: "10",
      });
    }
    next(error);
  }
});

userRoutes.post("/signin", async (req, res) => {
  // email, password
  const { success, data, error } = SigninSchema.safeParse(req.body);

  if (!success) {
    return res.status(400).json({
      error,
      number: "11",
    });
  }

  console.log("signin 1");

  const { email, password } = data;
  // email bhi compare ho gayi hai.
  const [isUserExist] = await db
    .select({ id: usersTable.id, password: usersTable.password })
    .from(usersTable)
    .where(eq(usersTable.email, email));

  console.log("signin 2");

  if (!isUserExist) {
    return res.status(400).json({
      message: "user doesn't exist. please signup",
      number: "12",
    });
  }
  console.log("signin 3");
  // password compare karna hai.
  const isPassworValid = await bcrypt.compare(password, isUserExist.password);
  console.log("signin 4");

  if (!isPassworValid) {
    return res.status(400).json({
      message: "invalid credentials",
      number: "13",
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
  const hashedToken = hashFunction(token);
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
    secure: false, // for https make true
    signed: true, // required for signedCookie .
    sameSite: "lax",
    expires: expiresAt,
  });
  console.log("signin 10");

  return res.status(200).json({
    message: "User signed successfully",
    number: "14",
  });
});

const NameUpdateSchema = SignupSchema.pick({
  name: true,
});
// update only name
userRoutes.patch("/", checkAuth, async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) {
    return res.status(400).json({
      message: "please create account first",
      number: "15",
    });
  }
  // try {
  //   const [isUserExist] = await db
  //     .select()
  //     .from(usersTable)
  //     .where(eq(usersTable.id, userId));

  //   if (!isUserExist) {
  //     return res.status(400).json({
  //       message: "user doesn't exist. please signup",
  //       number: "16",
  //     });
  //   }
  // } catch (error) {
  //   console.log("error in pathcd");
  //   console.log(error);
  // }

  const { success, data, error } = NameUpdateSchema.safeParse(req.body);
  if (!success) {
    return res.status(400).json({
      error,
    });
  }

  const { name } = data;

  try {
    await db
      .update(usersTable)
      .set({ name: name })
      .where(eq(usersTable.id, userId));
  } catch (error) {
    return res.status(500).json({
      error: "server error",
      number: "17",
    });
  }
  return res.status(300).json({
    message: "user name updated successfully",
    number: "18",
  });
});

// iss route main email or otp aayegi.
const EmailUpdateSchema = SignupSchema.pick({
  email: true,
  otp: true,
});
// update email by sending otp on the updated email
userRoutes.patch(
  "/",
  checkAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.userId;
    if (!userId) {
      return res.status(400).json({
        message: "please create account first",
        number: "19",
      });
    }
    const { success, data, error } = EmailUpdateSchema.safeParse(req.body);
    if (!success) {
      return res.status(400).json({
        error,
        number: "21",
      });
    }

    const { email, otp } = data;
    // otp send karne ke liye generated otp route ko hit karna hoga yaha nahi
    const hashOtp = hashFunction(otp);
    // otp verify hona ro email ka update hona transactoin manin hona chahiye
    try {
      await db.transaction(async (tx) => {
        const [isOtpExist] = await tx
          .select()
          .from(otpTable)
          .where(and(eq(otpTable.email, email), eq(otpTable.hashOtp, hashOtp)));
        if (!isOtpExist) {
          // return res.status(400).json({
          //   message: "Invalid otp or email",
          //   number: "24",
          // });
          throw new Error("OTP_FAILED");
        }
        const currentTime = new Date();
        if (currentTime > isOtpExist.expiresAt) {
          // return res.status(400).json({
          //   message: "otp is expired! pelase regenerate",
          //   number: "23",
          // });
          throw new Error("OTP_FAILED");
        }
        // deleteting otp afetr evryting goes right.
        await db.delete(otpTable).where(eq(otpTable.email, email));
        console.log("5");
        // now i can update the email
        await db
          .update(usersTable)
          .set({ email: email })
          .where(eq(usersTable.id, userId));
      });

      return res.status(300).json({
        message: "user name updated successfully",
        number: "25",
      });
    } catch (error) {
      console.log(error);
      next(error);
    }
  },
);

// isko imporove kran hai dekhan
// iss route main email or otp aayegi.
const UpdatePasswordSchema = SignupSchema.pick({
  password: true,
}).extend({
  oldPassword: SignupSchema.shape.password,
});
// update password
// take existing password and update with new password
userRoutes.patch(
  "/",
  checkAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId;
      if (!userId) {
        return res.status(400).json({
          message: "please create account first",
          number: "26",
        });
      }

      const [isUserExist] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, userId));

      if (!isUserExist) {
        return res.status(400).json({
          message: "user doesn't exist. please signup",
          number: "27",
        });
      }

      const { success, data, error } = UpdatePasswordSchema.safeParse(req.body);
      if (!success) {
        return res.status(400).json({
          error,
          number: "28",
        });
      }
      const { oldPassword, password } = data;

      const isOldPasswordValid = await bcrypt.compare(
        oldPassword,
        isUserExist.password,
      );

      if (!isOldPasswordValid) {
        return res.status(400).json({
          message: "password is not valide please enter correct password",
          number: "29",
        });
      }

      // crete hash for the new password
      const newHashPassword = await bcrypt.hash(password, 10);
      try {
        await db
          .update(usersTable)
          .set({ password: newHashPassword })
          .where(eq(usersTable.id, userId));
      } catch (error) {
        return res.status(500).json({
          message: "Server error",
          number: "30",
        });
      }

      return res.status(300).json({
        message: "password updated successfully",
        number: "31",
      });
    } catch (error) {
      console.log("error in update passwrod route");
      next(error);
    }
  },
);
