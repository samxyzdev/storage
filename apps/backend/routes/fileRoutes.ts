import { and, db, eq, filesTable, foldersTable, isNull } from "@repo/database";
import { Router, type Request, type Response } from "express";
import crypto from "node:crypto";
import path from "node:path";
import fs from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { lookup } from "mime-types";
import { pipeline } from "node:stream/promises";
import { FileSchema, flattenError, SignupSchema } from "@repo/zod";

export const fileRoutes: Router = Router();

// // 1. Sirf is route ke liye specific query
// // agar express.d.ts main likhta to sabhi route kel iye mandoty ho jata.
// // Request jo hai wo 4 cheeje leta hai.Request<RouteParams, RequestBody, RequestQuery ResponseBody,>
// // overwrite karne ke liye isi position pe interface dena hoga.

fileRoutes.post("/{:folderId}", async (req: Request, res: Response) => {
  // kis folder main hai ye file.
  const userId = req.userId;
  if (!userId) {
    return res.status(400).json({
      message: "4 something wrong",
    });
  }

  const rawFolderId = req.params.folderId || req.rootFolderId;
  const folderId = Array.isArray(rawFolderId) ? rawFolderId[0] : rawFolderId;
  if (!folderId) {
    return res.status(400).json({
      error: "1 invalid folder Id",
    });
  }

  // user given, readable file name.
  // req.header()
  // Ye ek method (function) hai jo specific header nikalne ke liye use hota hai.
  // req.headers
  // Ye Express request ke saare headers ka object hota hai.
  const rawFileName = req.header("fileName") || "untitled";
  console.log(rawFileName);
  const fileName = Array.isArray(rawFileName) ? rawFileName[0] : rawFileName;
  if (!fileName) {
    return res.status(400).json({
      error: "2 invalid fileName",
    });
  }
  try {
    // google drive mian same name hone pe option aata hai ya existing fiel se replace karo
    const [isFileNameExist] = await db
      .select()
      .from(filesTable)
      .where(
        and(eq(filesTable.fileName, fileName), eq(filesTable.userId, userId)),
      );
    if (isFileNameExist) {
      console.log("isFIle name existr");
      console.log(isFileNameExist);
      return res.status(400).json({
        message: "name of the file already exist please choose different name",
      });
    }
  } catch (error) {
    console.log("checkimng file name already exist or not");
    console.log(error);
  }
  const fileExtension = path.extname(fileName);
  const mimeType = lookup(fileName) || "application/octet-stream";
  // frontedn se file ka size. Backend pe bhi verify karo.
  const rawFileSize = req.header("fileSize");
  const fileSizeStr = Array.isArray(rawFileSize) ? rawFileSize[0] : rawFileSize;
  if (!fileSizeStr) {
    return res.status(400).json({
      error: "3 invalid. somethign",
    });
  }
  const fileSize = parseInt(fileSizeStr, 10);

  const uniqueFileName = crypto.randomBytes(32).toString("hex");

  const receivedFilesDetails = {
    folderId,
    fileName,
    fileExtension,
    mimeType,
    fileSize,
    uniqueFileName,
  };
  // using zod to parse
  const { success, data, error } = FileSchema.safeParse(receivedFilesDetails);
  if (!success) {
    return res.status(400).json({
      message: flattenError(error),
    });
  }
  const {
    fileName: verifiedFileName,
    fileSize: verifiedFileSize,
    folderId: verfiedRawFolderId,
    mimeType: verifyMimeType,
    uniqueFileName: verifyUniqueFileName,
  } = data;

  try {
    const storageDir = path.resolve("./storage");
    await fs.mkdir(storageDir, { recursive: true });
    const filePath = path.join(
      storageDir,
      `${verifyUniqueFileName}${fileExtension}`,
    );
    const writeStream = createWriteStream(filePath);
    try {
      // check akrne ke baad db main write karo.
      // saving file on disk.
      await pipeline(req, writeStream);

      // db entry
      const [result] = await db
        .insert(filesTable)
        .values({
          fileName: verifiedFileName,
          fileSize: verifiedFileSize,
          folderId: verfiedRawFolderId,
          mimeType: verifyMimeType,
          uniqueFileName: verifyUniqueFileName,
          userId,
        })
        .returning({
          insertedId: filesTable.id,
        });
      if (!result) {
        // db insert faile pe fiel delete
        await fs.unlink(filePath).catch((err) => {
          console.log(err);
        });
        return res.status(400).json({
          messge: "Failed to create databse record",
        });
      }

      return res.status(201).json({
        message: "Uploaded",
        fileId: result.insertedId,
      });
    } catch (error) {
      console.error(error);
      // agar uplaod ho the lekin db fail hua
      // to ifel cleanup karo
      await fs.unlink(filePath).catch(() => {});

      return res.status(500).json({
        message: "Upload failed",
      });
    }
    console.log("object");
  } catch (error) {
    console.error("Server error:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
});

// folder ke andar ki files leni hogi.
// kyunki VFS hai to mujhe keval VFS ko hi send karna hoga.
// agar user koi files ya folder pe click kare to use action ke according open ya downlaod karna hai.
// google main user jis folder pe hota hai keval usek children aate hai.
fileRoutes.get("/{:folderId}", async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) {
    return res.status(400).json({
      error: "not authorized",
    });
  }
  const rawFolderId = req.params.folderId || req.rootFolderId;
  const folderId = Array.isArray(rawFolderId) ? rawFolderId[0] : rawFolderId;
  if (!folderId) {
    return res.status(400).json({
      error: "1 invalid folder Id",
    });
  }
  // dont send the whole file.
  // keval user paas kya kya hai files and folder hai
  // agar user uspe click ya donwlaod karta hai tab hi send karn hai warna nahi.
  try {
    const folders = await db
      .select()
      .from(foldersTable)
      .where(
        and(
          eq(foldersTable.userId, userId),
          eq(foldersTable.parentId, folderId),
        ),
      );

    const files = await db
      .select()
      .from(filesTable)
      .where(
        and(eq(filesTable.userId, userId), eq(filesTable.folderId, folderId)),
      );

    return res.json({
      folders,
      files,
    });
  } catch (error) {
    console.log(error);
  }
});
// iss upr wali ka roue /api/v1/files/:folderId hai. mujhe isse sayad folder wale main rakhna chahiye

// sabhi folders main files hi hai to specific files ke liye yahi wali ya upr wali route hit karenge.
// ye route specific file get karne ke liye hai. ya to preview ya fir donwnalod.
// frontedn pe show karne ke liye hum parent folder ke child wali route ko hit karenge .get("/{:folderId}")
fileRoutes.get("/{:uniqueFileName}", async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) {
    return res.status(400).json({
      error: "not authorized",
    });
  }

  // ab mere paas user ki id hai.
  // kya mujhe frontedn se uniqueFileNameId leni chahiye
  // han or kya ye iss  user se belong karti hai wo bhi check karke fir send karna.
  const rawFileName = req.params.uniqueFileName;
  const uniqueFileName = Array.isArray(rawFileName)
    ? rawFileName[0]
    : rawFileName;
  if (!uniqueFileName) {
    return res.status(400).json({
      error: "uniqueFileName doesn't exist",
    });
  }
  // ab kyunki sabhi files storage folder mian hi hai to main uniqueFilename se find karke send kar skta hun.
  // pahle check karenge file iss user se belong karit hai ki nahi
  const [isFileExist] = await db
    .select()
    .from(filesTable)
    .where(
      and(
        eq(filesTable.uniqueFileName, uniqueFileName),
        eq(filesTable.userId, userId),
      ),
    );

  if (!isFileExist) {
    return res.status(400).json({
      message: "error happened",
    });
  }

  if (req.query.action === "downlaod") {
    res.download(`./storage/${uniqueFileName}`, `${isFileExist.fileName}`);
  } else {
    res.sendFile(`./storage/${uniqueFileName}`);
  }
});

const PatchSchema = SignupSchema;

fileRoutes.patch("/", async (req: Request, res: Response) => {
  const userId = req.userId;

  if (!userId) {
    return res.status(400).json({
      error: "You are not authorized",
    });
  }

  // body main existing file name and updated file name
  const { oldFileName, newFileName } = req.body;

  try {
    await db
      .update(filesTable)
      .set({ fileName: newFileName })
      .where(
        and(
          eq(filesTable.userId, userId),
          eq(filesTable.fileName, oldFileName),
        ),
      );
  } catch (error) {
    console.log(error);
  }
});

fileRoutes.delete("/", async (req: Request, res: Response) => {
  const fileId = req.body.fileId;
  if (!fileId) {
    return res.status(400).json({
      message: "File is required.",
    });
  }

  const userId = req.userId;
  if (!userId) {
    return res.status(400).json({
      error: "You are not authorized",
    });
  }
  try {
    const [filesData] = await db
      .select()
      .from(filesTable)
      .where(and(eq(filesTable.userId, userId), eq(filesTable.id, fileId)));
    if (!filesData) {
      return res.status(400).json({
        error: "No file exist",
      });
    }
    await fs.unlink(`./storage/${filesData?.uniqueFileName}`);
    await db.delete(filesTable).where(eq(filesTable.id, fileId));
  } catch (error) {
    console.log(error);
  }
});
