import { and, db, eq, filesTable, foldersTable, isNull } from "@repo/database";
import {
  Router,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import crypto from "node:crypto";
import path from "node:path";
import { extension, lookup } from "mime-types";
import { FileSchema, SignupSchema, z } from "@repo/zod";
import multer from "multer";
import { unlink } from "node:fs/promises";
import { CLIENT_RENEG_LIMIT } from "node:tls";

// 1. Multer DiskStorage configure karo (Manual stream ki zaroorat nahi)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Make sure storage folder exists
    cb(null, "storage/");
  },
  filename: (_, file, cb) => {
    // Unique file name with original extension
    const uniqueFileName = crypto.randomBytes(32).toString("hex");
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueFileName}${ext}`);
  },
});

const upload = multer({ storage });

export const   fileRoutes: Router = Router();
// // 1. Sirf is route ke liye specific query
// // agar express.d.ts main likhta to sabhi route kel iye mandoty ho jata.
// // Request jo hai wo 4 cheeje leta hai.Request<RouteParams, RequestBody, RequestQuery ResponseBody,>
// // overwrite karne ke liye isi position pe interface dena hoga.

fileRoutes.post(
  "{/:folderId}",
  upload.single("file"),
  async (req: Request, res: Response, next: NextFunction) => {
    // return res.status(200).send("fil uplodaed successfully");
    console.log("from file post route");
    //     {
    //   fieldname: "file",
    //   originalname: "authMiddleware.js",
    //   encoding: "7bit",
    //   mimetype: "application/octet-stream",
    //   destination: "storage/",
    //   filename: "6e48642c992f8a6f1c94784ba1a3d5bf1fd9ed01e4276c3fcbd21bf8fd073f96.js",
    //   path: "storage/6e48642c992f8a6f1c94784ba1a3d5bf1fd9ed01e4276c3fcbd21bf8fd073f96.js",
    //   size: 884,
    // }
    // kis folder main hai ye file.
    if (!req.file) {
      return res.status(500).json({
        message: "uplaod failed.",
        number: "35",
      });
    }

    const userId = req.userId;
    if (!userId) {
      await unlink(req.file.path);
      return res.status(400).json({
        message: "4 something wrong.",
        number: "36",
      });
    }
    // kis folder main uplaod ho rha hai wo.
    const rawFolderId = req.params.folderId || req.rootFolderId;
    const folderId = Array.isArray(rawFolderId) ? rawFolderId[0] : rawFolderId;
    if (!folderId) {
      return res.status(400).json({
        error: "1 invalid folder Id",
        number: "37",
      });
    }
    // user given, readable file name.
    // req.header()
    // Ye ek method (function) hai jo specific header nikalne ke liye use hota hai.
    // req.headers
    // Ye Express request ke saare headers ka object hota hai.
    // const rawFileName = req.header("fileName") || "untitled";
    // console.log(rawFileName);
    // const fileName = Array.isArray(rawFileName) ? rawFileName[0] : rawFileName;
    const originalFileName = req.file.originalname;
    // if (!fileName) {
    //   return res.status(400).json({
    //     error: "2 invalid fileName",
    //   });
    // }
    try {
      // google drive mian same name hone pe option aata hai ya existing fiel se replace karo
      const [isFileNameExist] = await db
        .select()
        .from(filesTable)
        .where(
          and(
            eq(filesTable.fileName, originalFileName),
            eq(filesTable.userId, userId),
          ),
        );
      if (isFileNameExist) {
        console.log("isFIle name existr");
        console.log(isFileNameExist);
        await unlink(req.file.path);
        return res.status(400).json({
          message:
            "name of the file already exist please choose different name",
          number: "38",
        });
      }
    } catch (error) {
      console.log("checkimng file name already exist or not");
      console.log(error);
    }
    const fileExtension = path.extname(originalFileName);
    const mimeType = lookup(originalFileName) || "application/octet-stream";

    // // frontedn se file ka size. Backend pe bhi verify karo.
    // const rawFileSize = req.header("fileSize");
    // const fileSizeStr = Array.isArray(rawFileSize)
    //   ? rawFileSize[0]
    //   : rawFileSize;
    // if (!fileSizeStr) {
    //   return res.status(400).json({
    //     error: "3 invalid. somethign",
    //   });
    // }
    // const fileSize = parseInt(fileSizeStr, 10);
    const fileSize = req.file.size;

    const uniqueFileName = req.file.filename;

    const receivedFilesDetails = {
      folderId,
      fileName: originalFileName,
      fileExtension,
      mimeType,
      fileSize,
      uniqueFileName,
    };
    // using zod to parse
    const { success, data, error } = FileSchema.safeParse(receivedFilesDetails);
    if (!success) {
      await unlink(req.file.path);
      return res.status(400).json({
        message: z.flattenError(error),
        number: "39",
      });
    }
    const {
      fileName: verifiedFileName,
      fileSize: verifiedFileSize,
      folderId: verfiedRawFolderId,
      mimeType: verifyMimeType,
      uniqueFileName: verifyUniqueFileName,
    } = data;
    const uniquFileNameWithoutExtension = verifyUniqueFileName.split(".")[0];
    if (!uniquFileNameWithoutExtension) {
      return res.status(500).json({
        message: "server error",
        number: "40",
      });
    }

    try {
      // db entry
      const [result] = await db
        .insert(filesTable)
        .values({
          fileName: verifiedFileName,
          fileSize: verifiedFileSize,
          folderId: verfiedRawFolderId,
          mimeType: verifyMimeType,
          uniqueFileName: uniquFileNameWithoutExtension,
          userId,
        })
        .returning({
          insertedId: filesTable.id,
        });
      if (!result) {
        // db insert faile pe fiel delete
        await unlink(req.file.path);
        return res.status(400).json({
          messge: "Failed to create databse record",
          number: "41",
        });
      }
    } catch (error) {
      console.log(error);
      await unlink(req.file.path);
      next(error);
    }
    return res.status(200).json({
      message: "file uploaded successfully",
      fileUniqueId: uniquFileNameWithoutExtension,
      number: "42",
    });

    // try {
    //   const storageDir = path.resolve("./storage");
    //   await fs.mkdir(storageDir, { recursive: true });
    //   const filePath = path.join(
    //     storageDir,
    //     `${verifyUniqueFileName}${fileExtension}`,
    //   );
    //   const writeStream = createWriteStream(filePath);
    //   try {
    //     // check akrne ke baad db main write karo.
    //     // saving file on disk.
    //     await pipeline(req, writeStream);

    //     // db entry
    //     const [result] = await db
    //       .insert(filesTable)
    //       .values({
    //         fileName: verifiedFileName,
    //         fileSize: verifiedFileSize,
    //         folderId: verfiedRawFolderId,
    //         mimeType: verifyMimeType,
    //         uniqueFileName: verifyUniqueFileName,
    //         userId,
    //       })
    //       .returning({
    //         insertedId: filesTable.id,
    //       });
    //     if (!result) {
    //       // db insert faile pe fiel delete
    //       await fs.unlink(filePath).catch((err) => {
    //         console.log(err);
    //       });
    //       return res.status(400).json({
    //         messge: "Failed to create databse record",
    //       });
    //     }

    //     return res.status(201).json({
    //       message: "Uploaded",
    //       fileId: result.insertedId,
    //     });
    //   } catch (error) {
    //     console.error(error);
    //     // agar uplaod ho the lekin db fail hua
    //     // to ifel cleanup karo
    //     await fs.unlink(filePath).catch(() => {});

    //     return res.status(500).json({
    //       message: "Upload failed",
    //     });
    //   }
    //   console.log("object");
    // } catch (error) {
    //   console.error("Server error:", error);
    //   return res.status(500).json({
    //     message: "Internal server error",
    //   });
    // }
  },
);

// ye route specific file get karne ke liye hai.
// ya to preview ya fir donwnalod.
// frontedn pe show karne ke liye hum parent folder ke child wali route ko hit karenge .get("/{:folderId}")
fileRoutes.get("/:uniqueFileName", async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) {
    return res.status(400).json({
      error: "not authorized",
      number: "46",
    });
  }

  // ab mere paas user ki id hai.
  // kya mujhe frontedn se uniqueFileNameId leni chahiye
  // han or kya ye iss  user se belong karti hai wo bhi check karke fir send karna.
  const rawFileName = req.params.uniqueFileName;
  const uniqueFileName = Array.isArray(rawFileName)
    ? rawFileName[0]
    : rawFileName;
  console.log(uniqueFileName)
  console.log(req.query)
  console.log(req.query.action)
  
  if (!uniqueFileName) {
    return res.status(400).json({
      error: "uniqueFileName doesn't exist",
      number: "47",
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
      number: "48",
    });
  }

  const ext = extension(isFileExist.mimeType);
  const filePath = path.join(process.cwd(),"storage",`${uniqueFileName}.${ext}`)
  console.log(filePath)
  if (req.query.action === "downlaod") {
    console.log("downlaod");
    console.log(uniqueFileName);
    res.download(
      filePath,
      `${isFileExist.fileName}`,
    );
  } else if (req.query.action === "preview") {
    res.sendFile(filePath);
  } else {
    return res.status(400).json({
    message:"karna kya chahte ho"
  })
  }
  
});

// File Rename.
const PatchSchema = FileSchema.pick({
  fileName: true,
}).extend({
  newFileName: z.string(),
});

fileRoutes.patch("/", async (req: Request, res: Response) => {
  const userId = req.userId;

  if (!userId) {
    return res.status(400).json({
      error: "You are not authorized",
      number: "49",
    });
  }

  const { success, data, error } = PatchSchema.safeParse(req.body);
  if (!success) {
    return res.status(400).json({
      error: error,
    });
  }

  // body main existing file name and updated file name
  const { fileName: oldFileName, newFileName } = data;

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
    return res.status(400).json({
      error: error,
      Number: "from rename route ",
    });
  }
});

fileRoutes.delete("/:fileId", async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) {
    return res.status(400).json({
      error: "You are not authorized",
      number: "51",
    });
  }
  console.log("delete 1")

  const rawFileId = req.params.fileId;
  const fileId = Array.isArray(rawFileId) ? rawFileId[0] : rawFileId;
  if (!fileId) {
    return res.status(400).json({
      message: "FileID is required.",
      number: "50",
    });
  }
  console.log(fileId)

  try {
      const [filesData] = await db
      .select()
      .from(filesTable)
      .where(and(eq(filesTable.userId, userId), eq(filesTable.uniqueFileName, fileId)));

    if (!filesData) {
      return res.status(400).json({
        error: "No file exist",
        number: "52",
      });
    }
    const ext = extension(filesData.mimeType);
    const filePath = path.join(process.cwd(),"storage",`${filesData.uniqueFileName}.${ext}`)
    await db.transaction(async (tx) => {
        await unlink(filePath)
      
      const [isFileExist] = await tx.delete(filesTable).where(and(eq(filesTable.userId, userId), eq(filesTable.uniqueFileName, fileId))).returning({insertedId:filesTable.id});
      
      if (!isFileExist) {
        throw new Error()
      }
      return res.status(200).json({
        message:"File Delted Successfully"
      })
    })
    
  } catch (error) {
    console.log(error);
    return res.status(400).json({
      error: error,
      Number: "from delete route",
    });
  }
});
