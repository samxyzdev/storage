import { and, db, eq, foldersTable } from "@repo/database";
import { Router, type Request, type Response } from "express";

export const folderRoutes: Router = Router();

folderRoutes.post("/", async (req: Request, res: Response) => {
  // Googlde Drive folder uplaod ko suuport karta hai.
  // folderName, parentId, uniqueFOlderName,
  // verify on backend if its a folder.
  // files ke liye mujeh bas db main entry karni hogi.
  // root folder to ban chuka hai ab jo folder bange wo sabhi root ke andar hi honge.
  console.log(req.body);
});

folderRoutes.post("/create-folder", async (req: Request, res: Response) => {
  const userId = req.userId;
});

folderRoutes.patch("/", async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) {
    return res.status(400).json({
      error: "You are not authorized",
    });
  }
  // zod validatoin
  const { oldFolderNmae, newFolderName } = req.body;
  try {
    await db
      .update(foldersTable)
      .set({ folderName: newFolderName })
      .where(
        and(
          eq(foldersTable.userId, userId),
          eq(foldersTable.folderName, oldFolderNmae),
        ),
      );
  } catch (error) {
    console.log(error);
  }
});
