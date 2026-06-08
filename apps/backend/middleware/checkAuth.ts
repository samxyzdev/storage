import type { NextFunction, Request, Response } from "express";
import crypto from "crypto";
import { and, db, eq, foldersTable, ne, sessionTable } from "@repo/database";

export const checkAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  console.dir(req.cookies);
  console.dir(req.signedCookies);
  const { sid } = req.signedCookies;
  console.log(sid);
  if (!sid) {
    return res.status(400).json({
      message: "checkAuth 1 Invalide session",
    });
  }

  const hashedToken = crypto.createHash("sha256").update(sid).digest("hex");
  console.log("auth hash sid");
  console.log(hashedToken);

  const [isSessionExist] = await db
    .select()
    .from(sessionTable)
    .where(eq(sessionTable.token, hashedToken));

  if (!isSessionExist) {
    return res.status(400).json({
      message: "Please signin/signup",
    });
  }
  const [folder] = await db
    .select()
    .from(foldersTable)
    .where(
      and(
        eq(foldersTable.userId, isSessionExist.userId),
        eq(foldersTable.folderName, "root"),
      ),
    );

  if (!folder) {
    return res.status(400).json({
      message: "folder doesn't exist/ Please signup",
    });
  }
  req.userId = isSessionExist.userId;
  req.rootFolderId = folder.id;
  next();
};

// export const checkNotRegularUser = (
//   req: Request,
//   res: Response,
//   next: NextFunction,
// ) => {
//   if (req.user.role !== "User") return next();
//   res.status(403).json({
//     error: "You can not access users",
//   });
// };

// export const checkIsAdminUser = (
//   req: Request,
//   res: Response,
//   next: NextFunction,
// ) => {
//   if (req.user.role === "Admin") return next();
//   res.status(403).json();
// };
