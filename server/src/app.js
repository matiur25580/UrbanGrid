import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { env } from "./config/env.js";
import { authRoutes } from "./modules/auth/index.js";

export function createApp({ databaseStatus = () => "not-connected" } = {}) {
  const app = express();

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors({
    origin: env.CLIENT_ORIGIN,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
  }));
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: false, limit: "1mb" }));
  app.use(cookieParser());
  app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: "draft-8",
    legacyHeaders: false
  }));

  app.get(`${env.API_PREFIX}/health`, (_req, res) => {
    res.status(200).json({
      success: true,
      data: {
        service: "urbangrid-api",
        status: "alive",
        environment: env.NODE_ENV,
        timestamp: new Date().toISOString()
      }
    });
  });

  app.get(`${env.API_PREFIX}/ready`, (_req, res) => {
    const database = databaseStatus();
    const ready = database === "connected";
    res.status(ready ? 200 : 503).json({
      success: ready,
      data: { status: ready ? "ready" : "not-ready", database }
    });
  });

  app.use(`${env.API_PREFIX}/auth`, authRoutes);

  app.use((_req, res) => {
    res.status(404).json({
      success: false,
      error: { code: "ROUTE_NOT_FOUND", message: "The requested resource was not found." }
    });
  });

  app.use((error, _req, res, _next) => {
    console.error(error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: {
        code: error.code || "INTERNAL_SERVER_ERROR",
        message: env.NODE_ENV === "production"
          ? "An unexpected error occurred."
          : error.message
      }
    });
  });

  return app;
}
