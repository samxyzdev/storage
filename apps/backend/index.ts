import express from "express";
import cors from "cors";
import { userRoutes } from "./routes/userRoutes";

const app = express();

app.use(express.json());
app.use(cors());

app.use("/api/v1/user", userRoutes);

app.listen(3000, () => {
  console.log("running or port 3000");
});
