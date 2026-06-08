import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import cors from "cors";
import { userRoutes } from "./routes/userRoutes";
import cookieParser from "cookie-parser";
import { otpRoutes } from "./routes/otpRoutes";
import { fileRoutes } from "./routes/fileRoutes";
import { checkAuth } from "./middleware/checkAuth";
import { folderRoutes } from "./routes/folderRoutes";

const app = express();

app.use(express.json());
app.use(cors());
app.use(cookieParser(process.env.COOKIE_SECRET)); // secret required for signed cookie

app.use("/api/v1/otp", otpRoutes);
app.use("/api/v1/user", userRoutes);
app.use("/api/v1/files", checkAuth, fileRoutes);
app.use("/api/v1/folders", checkAuth, folderRoutes);

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.message || err);
  res.status(500).json({
    error: "Internal server error",
  });
});

const server = app.listen(3001, () => {
  console.log("running or port 3001");
});
