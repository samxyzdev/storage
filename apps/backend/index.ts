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

const app = express();

app.use(express.json());
app.use(cors());
app.use(cookieParser("Sameer Ahmed")); // secret required for signed cookie

app.use("/api/v1/otp", otpRoutes);
app.use("/api/v1/user", userRoutes);
app.use("/api/v1/files", checkAuth, fileRoutes);

// app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
//   console.error(err.message || err);
//   res.status(500).json({
//     error: "Internal server error",
//   });
// });

app.listen(3001, () => {
  console.log("running or port 3001");
});
