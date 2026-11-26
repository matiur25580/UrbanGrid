import mongoose from "mongoose";
import { createApp } from "./app.js";
import { env } from "./config/env.js";

const app = createApp({
  databaseStatus: () => mongoose.connection.readyState === 1 ? "connected" : "disconnected"
});

let server;

async function start() {
  try {
    await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
    server = app.listen(env.PORT, () => {
      console.info(`UrbanGrid API listening on port ${env.PORT}`);
    });
  } catch (error) {
    console.error("Unable to connect to MongoDB:", error.message);
    process.exit(1);
  }
}

async function shutdown(signal) {
  console.info(`${signal} received; shutting down gracefully.`);
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await mongoose.disconnect();
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

start();
