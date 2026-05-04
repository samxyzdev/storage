import express from "express";

declare module "express" {
  // Inject additional properties on express.Request
  interface Request {
    userId?: string;
    rootFolderId?: string;
  }
}

// express wale request type ko inspect kra to mila aise tha.
