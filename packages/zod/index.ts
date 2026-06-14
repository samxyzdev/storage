import * as z from "zod";

export const SignupSchema = z.object({
  name: z.string().min(3, "Too short").max(25),
  email: z.email().min(3, "Too short").max(25),
  password: z.string().min(8).max(30),
  otp: z.string().min(6).max(6),
});

export const SigninSchema = z.object({
  email: z.email().min(3, "Too short").max(25),
  password: z.string().min(8).max(30),
});

export const FileSchema = z.object({
  uniqueFileName: z.string(),
  fileName: z.string().min(1, "Too short").max(25, "Too large"),
  fileSize: z.number(),
  mimeType: z.string(),
  folderId: z.string(),
});

export const FolderSchema = z.object({
  uniqueFolderName: z.string(),
  folderName: z.string(),
  parentId: z.string(),
});

export * as z from "zod";
