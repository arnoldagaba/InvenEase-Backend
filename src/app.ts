import express, { Express, Request, Response } from "express";
import http from "http";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import { StatusCodes } from "http-status-codes";
import swaggerUi from "swagger-ui-express";
import { setupSocketIO } from "./socket.ts";
import {
    morganMiddleware,
    requestPerformanceLogger,
} from "./common/middleware/logger.middleware.ts";
import { apiRateLimiter } from "./common/middleware/rate-limiter.middleware.ts";
import config from "./common/config/env.ts";
import appRoutes from "./modules/routes/index.ts";
import { errorMiddleware, notFoundHandler } from "./common/middleware/error.middleware.ts";
import { swaggerSpec } from "./common/config/swagger.ts";
import { metrics } from "./common/config/monitoring.ts";
import { cleanupService } from "./common/services/cleanup.service.ts";

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

// --- Rate Limiting ---
app.use(apiRateLimiter);

// --- Logger middleware ---
app.use(requestPerformanceLogger);
app.use(morganMiddleware);

// --- API Documentation ---
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// --- Metrics endpoint ---
app.get("/metrics", async (_req: Request, res: Response) => {
    try {
        res.set("Content-Type", "text/plain");
        const metricsData = await metrics.getMetrics();
        res.send(metricsData);
    } catch (error) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            status: "error",
            message: "Failed to get metrics",
        });
    }
});

// --- Health check ---
app.get("/api/health", (_req: Request, res: Response) => {
    res.status(StatusCodes.OK).json({
        status: "success",
        message: "Server is running",
        timestamp: new Date().toISOString(),
        environment: config.server.environment,
    });
});

// --- API Versioning ---
// All routes will be prefixed with /api/v1
app.use("/api/v1", appRoutes);

// --- Error handling middleware ---
app.use(notFoundHandler);
app.use(errorMiddleware);

// Start cleanup service
cleanupService.start();

export default server;
