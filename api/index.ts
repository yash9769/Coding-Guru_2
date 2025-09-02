// Load environment variables FIRST before any other imports
import "./env.ts";

import express from "express";
import serverless from "serverless-http";
import { registerRoutes } from "./routes.ts";
import { serveStatic, log } from "./vite.ts";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    log(`${req.method} ${req.path} ${res.statusCode} - ${duration}ms`);
  });
  next();
});

// Register all the routes
registerRoutes(app);

// In a production (Netlify) environment, serve static files
if (process.env.NODE_ENV === "production") {
  serveStatic(app);
}

// Export the handler for Netlify
export const handler = serverless(app);