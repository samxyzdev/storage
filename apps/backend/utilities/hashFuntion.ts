import crypto from "node:crypto";

export const hashFunction = (data: string) => {
  return crypto.createHash("sha256").update(data).digest("hex");
};
