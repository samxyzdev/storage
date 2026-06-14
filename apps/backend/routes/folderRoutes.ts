import { and, db, eq, filesTable, foldersTable } from "@repo/database";
import { Router, type Request, type Response } from "express";
import { getFolderBreadcrumbs } from "../utilities/breadCrumbQuery";
import crypto from "node:crypto";
import { FolderSchema } from "@repo/zod";
import { error } from "node:console";

export const folderRoutes: Router = Router();

// read
// google main user jis folder pe hota hai keval usek children aate hai.
folderRoutes.get("{/:folderId}", async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) {
    return res.status(400).json({
      error: "not authorized",
      number: "43",
    });
  }
  const rawFolderId = req.params.folderId || req.rootFolderId;
  const folderId = Array.isArray(rawFolderId) ? rawFolderId[0] : rawFolderId;
  if (!folderId) {
    return res.status(400).json({
      error: "1 invalid folder Id",
      number: "44",
    });
  }
  // dont send the whole file.
  // keval user paas kya kya hai files and folder hai
  // agar user uspe click ya donwlaod karta hai tab hi send karn hai warna nahi.
  try {
    //jo folderID hai wo kis folder mian hai wo bta raha hai. wo folder kis folder main hai wo nahi kyuni request send ho jayegi
    // ya to loop karun yahan main uska paren kya hai.
    // const folders = await db
    //   .select()
    //   .from(foldersTable)
    //   .where(
    //     and(
    //       eq(foldersTable.userId, userId),
    //       eq(foldersTable.parentId, folderId),
    //     ),
    //   );
    //breqdcrumb
    const folders = await getFolderBreadcrumbs(folderId);
    // folder main files bhi hoti hai to wo bhi send karna. jaise direct files root folder mian.
    const files = await db
      .select()
      .from(filesTable)
      .where(
        and(eq(filesTable.userId, userId), eq(filesTable.folderId, folderId)),
      );

    return res.json({
      folders,
      files,
      number: "45",
    });
  } catch (error) {
    console.log(error);
  }
});
// iss upr wali ka roue /api/v1/files/:folderId hai. mujhe isse sayad folder wale main rakhna chahiye

// create folder
// folderName, folderId (kis folder main create kar rha hai.),
// folderId isliye takki pta rahe kis folder ke andar ban rha hai.
folderRoutes.post("/{:folderId}", async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) {
    return res.status(400).json({
      message: "user id not exist.",
    });
  }
  const rawFolderId = req.params.folderId || req.rootFolderId;
  const folderId = Array.isArray(rawFolderId) ? rawFolderId[0] : rawFolderId;
  if (!folderId) {
    return res.status(500).json({
      message: "server error",
    });
  }
  const folderName = req.body.folderName || "untitled";
  const uniqueFolderName = crypto.randomUUID();

  // ab kyunki main server pe hi generate kar rah hun to mujeh verify karne ki jaroorat nahi hia.
  const { success, data, error } = FolderSchema.safeParse({
    folderId,
    folderName,
  });

  if (!success) {
    return res.status(400).json({
      error: error,
    });
  }

  const {
    folderName: verifiedFolderName,
    folderId: verifiedFolderId,
    parentId,
    uniqueFolderName: verifiedUniqueFolderName,
  } = data;

  try {
    await db.insert(foldersTable).values({
      folderName: verifiedFolderName,
      uniqueFolderName,

      userId,
    });
  } catch (error) {
    console.log(error);
    return res.status(400).json({
      error: error,
    });
  }
});

// rename folder
folderRoutes.patch("/", async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) {
    return res.status(400).json({
      message: "user id not exist.",
    });
  }
  const { folderName: oldFolderName, newFolderName } = req.body;

  try {
    await db
      .update(foldersTable)
      .set({ folderName: newFolderName })
      .where(
        and(
          eq(foldersTable.userId, userId),
          eq(foldersTable.folderName, oldFolderName),
        ),
      );
  } catch (error) {
    console.log(error);
    return res.status(400).json({
      error: error,
      message: "from folder rename route",
    });
  }
});

// abhi to param main le rha hun bad main dekhenge.
//delete folder
folderRoutes.patch("/:folderId", async (req: Request, res: Response) => {
  // kyta ye uniqueFOlderId hai ya keval name hai
  const userId = req.userId;
  if (!userId) {
    return res.status(400).json({
      message: "user id not exist.",
    });
  }

  const rawFolderId = req.params.folderId;
  const folderId = Array.isArray(rawFolderId) ? rawFolderId[0] : rawFolderId;
  if (!folderId) {
    return res.status(500).json({
      error: "eerro hai dlete mropute ke fodler id main",
    });
  }

  try {
    await db
      .delete(foldersTable)
      .where(
        and(eq(foldersTable.userId, userId), eq(foldersTable.id, folderId)),
      );
    // iss folder main jo files hai wo bhi delete
    await db
      .delete(filesTable)
      .where(
        and(eq(filesTable.folderId, folderId), eq(filesTable.userId, userId)),
      );
  } catch (error) {
    console.log(error);
    return res.status(400).json({
      error: error,
      message: "from folder rename route",
    });
  }
});
