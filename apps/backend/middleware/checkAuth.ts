import type { NextFunction, Request, Response } from "express";
import crypto from "crypto";
import { and, db, eq, foldersTable, ne, sessionTable } from "@repo/database";

export const checkAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  console.log("from check Auth");
  console.dir(req.cookies);
  console.dir(req.signedCookies);
  const { sid } = req.signedCookies;
  console.log(sid);
  if (!sid) {
    return res.status(400).json({
      message: "checkAuth 1 Invalide session",
      number: "32",
    });
  }

  const hashedToken = crypto.createHash("sha256").update(sid).digest("hex");
  console.log("print hash token inside checkAuth");
  console.log(hashedToken);

  const [isSessionExist] = await db
    .select()
    .from(sessionTable)
    .where(eq(sessionTable.token, hashedToken));

  if (!isSessionExist) {
    return res.status(400).json({
      message: "Please signin/signup",
      number: "33",
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
      number: "34",
    });
  }
  req.userId = isSessionExist.userId;
  req.rootFolderId = folder.id;
  next();
};
