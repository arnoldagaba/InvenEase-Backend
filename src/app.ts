import express, { Express, Request, Response } from "express";
import http from "http";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import { StatusCodes } from "http-status-codes";
import { setupSocketIO } from "./socket.ts";
import {
    morganMiddleware,
    requestPerformanceLogger,
} from "./common/middleware/logger.middleware.ts";
import config from "./common/config/env.ts";
import appRoutes from "./modules/routes/index.ts";
import {
    errorMiddleware,
    notFoundHandler,
} from "./common/middleware/error.middleware.ts";

const app: Express = express();
const server = http.createServer(app);

// Set up Socket.IO
const io = setupSocketIO(server);
// Store io instance globally to use in other modules
global.io = io;

// --- Core middleware ---
app.use(helmet());
app.use(
    cors({
        origin: config.frontend.url || "http://localhost:5174",
        credentials: true,
    })
);
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Logger middleware ---
app.use(requestPerformanceLogger);
app.use(morganMiddleware);

// --- Health check ---
app.get("/api/health", (_req: Request, res: Response) => {
    res.status(StatusCodes.OK).json({
        status: "success",
        message: "Server is running",
        timestamp: new Date().toISOString(),
        environment: config.server.environment,
    });
});

// --- Routes ---
app.use("/api", appRoutes);

// --- Error handling middleware ---
app.use(notFoundHandler);
app.use(errorMiddleware);

export default server;
