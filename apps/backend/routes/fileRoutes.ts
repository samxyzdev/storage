import { db, eq, filesTable } from "@repo/database";
import { Router, type Request, type Response } from "express";
import { createWriteStream } from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import fs from "node:fs";
import { lookup } from "mime-types";
import { json } from "node:stream/consumers";

export const fileRoutes: Router = Router();

fileRoutes.post("/{folderId}", async (req: Request, res: Response) => {
  //     folderId,
  //     fileName,
  //     fileSize,
  //     mimeType,
  //     uniqueFileName,
  //     userId,
  const rawFolderId = req.params.folderId || req.rootFolderId;
  const folderId = Array.isArray(rawFolderId) ? rawFolderId[0] : rawFolderId;
  if (!folderId) {
    return res.status(400).json({
      error: "1 invalid file types",
    });
  }

  const rawFileName = req.headers["x-file-name"];
  const fileName = Array.isArray(rawFileName) ? rawFileName[0] : rawFileName;
  if (!fileName) {
    return res.status(400).json({
      error: "2 invalid file types",
    });
  }

  const mimeType = lookup(fileName) || "application/octet-stream";

  const rawFileSize = req.headers.filesize;
  const fileSizeStr = Array.isArray(rawFileSize) ? rawFileSize[0] : rawFileSize;
  if (!fileSizeStr) {
    return res.status(400).json({
      error: "3 invalid. somethign",
    });
  }
  const fileSize = parseInt(fileSizeStr, 10);

  const uniqueFileName = crypto.randomBytes(32).toString("hex");

  const userId = req.userId;
  if (!userId) {
    return res.status(400).json({
      message: "4 something wrong",
    });
  }

  try {
    const [result] = await db
      .insert(filesTable)
      .values({
        fileName,
        fileSize,
        folderId,
        mimeType,
        uniqueFileName,
        userId,
      })
      .returning({
        insertedId: filesTable.id,
      });

    if (!result) {
      return res.status(400).json({
        messge: "someting went wrong",
      });
    }

    const storageDir = path.resolve("./storage");
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }

    const writeStream = createWriteStream(
      path.join(storageDir, uniqueFileName),
    );

    writeStream.on("error", async (err) => {
      console.error("Write stream error,", err);
      await db.delete(filesTable).where(eq(filesTable.id, result.insertedId));
      if (!res.headersSent) {
        return res.status(500).json({
          message: "Error writing file to disk",
        });
      }
    });

    req.pipe(writeStream);

    req.on("end", () => {
      if (!res.headersSent) {
        return res.status(201).json({ message: "File Uploaded" });
      }
    });

    req.on("error", async (err) => {
      console.error("Request stream error:", err);
      await db.delete(filesTable).where(eq(filesTable.id, result.insertedId));
      if (!res.headersSent) {
        return res.status(500).json({ message: "Upload interrupted" });
      }
    });
  } catch (error) {
    console.error("Server error:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
});
