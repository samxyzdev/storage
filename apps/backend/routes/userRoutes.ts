import { Router } from "express";
import {db,otpTable,usersTable} from "@repo/database"

export const userRoutes: Router = Router();

userRoutes.post("/signup", (req, res) => {
    // name , emai, password, otp
  console.log("hello");
  const [] = 
});

userRoutes.post("/signin", (req, res) => {
  console.log("hello");
});
