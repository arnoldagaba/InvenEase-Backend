import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import config from "../config/env.ts";
import { AppError, handlePrismaError, logError } from "../utils/errorHandler.ts";

export function errorMiddleware(
    err: unknown,
    req: Request,
    res: Response,
    next: NextFunction
) {
    logError(err as Error, req);
    const error = err instanceof AppError ? err : handlePrismaError(err);

    const isDev = config.server.environment === "development";
    const payload: Record<string, any> = {
        status: "error",
        message: error.message,
    };
    if (isDev) {
        payload.details = {
            name: error.name,
            stack: error.stack,
            isOperational: error.isOperational,
        };
    }
    res.status(error.statusCode).json(payload);
}

export function notFoundHandler(
    req: Request,
    res: Response,
    next: NextFunction
) {
    next(
        new AppError(
            `Cannot find ${req.originalUrl} on this server`,
            StatusCodes.NOT_FOUND
        )
    );
}
