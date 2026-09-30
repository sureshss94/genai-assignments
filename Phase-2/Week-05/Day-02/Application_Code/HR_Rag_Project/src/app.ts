import cors from "cors";
import express from "express";
import { getMongoDatabase } from "./config/database";
import { errorHandler } from "./middleware/errorHandler";
import { requestId } from "./middleware/requestId";
import { requestLogger } from "./middleware/logger";
import ingestionRoutes from "./modules/ingestion/routes/ingestionRoutes";

const app = express();

app.use(cors());
app.use(express.json());
app.use(requestId);
app.use(requestLogger);
app.use("/v1", ingestionRoutes);

app.get("/v1/health", (_request, response) => {
  response.status(200).json({
    status: "ok",
    app: "resume-rag-backend",
    version: "1.0.0",
    uptime: Number(process.uptime().toFixed(1))
  });
});

app.get("/v1/health/db", async (_request, response) => {
  const startedAt = Date.now();

  try {
    const database = await getMongoDatabase();
    database.collection("resumes");
    await database.command({ ping: 1 });

    response.status(200).json({
      status: "ok",
      database: "mongodb",
      connected: true,
      latencyMs: Date.now() - startedAt
    });
  } catch {
    response.status(503).json({
      status: "error",
      database: "mongodb",
      connected: false,
      errorCode: "DB_CONNECTION_FAILED"
    });
  }
});

app.use(errorHandler);

export default app;