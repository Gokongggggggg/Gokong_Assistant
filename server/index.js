import "dotenv/config";
import express from "express";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { initDB } from "../src/db.js";
import standupRoutes from "./routes/standup.js";
import reviewRoutes from "./routes/review.js";
import competitionRoutes from "./routes/competitions.js";
import challengeRoutes from "./routes/challenges.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

import "../src/index.js";

const app = express();
app.use(express.json());

const auth = (req, res, next) => {
  const key = req.headers["x-dashboard-key"];
  if (key !== process.env.DASHBOARD_PASSWORD) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
};

app.use("/api/standup", auth, standupRoutes);
app.use("/api/review", auth, reviewRoutes);
app.use("/api/competitions", auth, competitionRoutes);
app.use("/api/challenges", auth, challengeRoutes);

app.get("/health", (_, res) => res.json({ ok: true }));

const dashDist = join(__dirname, "../dashboard/dist");
app.use(express.static(dashDist));
app.get("*", (_, res) => res.sendFile(join(dashDist, "index.html")));

await initDB();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on :${PORT}`));