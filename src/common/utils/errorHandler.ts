import { Request } from "express";
import { StatusCodes } from "http-status-codes";
import { Prisma } from "../../generated/prisma/client.ts";
import logger from "./logger.ts";

export class AppError extends Error {
    public readonly statusCode: number;
    public readonly isOperational: boolean;
    public readonly code?: string;
    public readonly path?: string;
    public readonly value?: string;

    constructor(
        message: string,
        statusCode: number,
        isOperational = true,
        code?: string,
        path?: string,
        value?: string
    ) {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = this.constructor.name;
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.code = code;
        this.path = path;
        this.value = value;
        Error.captureStackTrace(this, this.constructor);
    }
}

export function handlePrismaError(error: unknown): AppError {
    if (error instanceof AppError) return error;

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        const code = error.code;
        const target = (error.meta?.target as string[])?.join(", ") || "field";
        switch (code) {
            case "P2002":
                return new AppError(
                    `A record with ${target} already exists.`,
                    StatusCodes.CONFLICT
                );
            case "P2001":
            case "P2018":
                return new AppError("Record not found.", StatusCodes.NOT_FOUND);
            case "P2003":
                return new AppError(
                    "Operation failed due to a relation constraint.",
                    StatusCodes.BAD_REQUEST
                );
            case "P2011":
                return new AppError(
                    `The ${target} field is required.`,
                    StatusCodes.BAD_REQUEST
                );
        }
    }

    if (error instanceof Prisma.PrismaClientValidationError) {
        return new AppError(
            "Validation error: The request data is invalid.",
            StatusCodes.BAD_REQUEST
        );
    }

    // Fallback for unknown errors
    return new AppError(
        "An unexpected error occurred.",
        StatusCodes.INTERNAL_SERVER_ERROR,
        false
    );
}

export function logError(err: Error, req?: Request): void {
    const info: Record<string, any> = {
        name: err.name,
        message: err.message,
        stack: err.stack,
    };
    if (req) {
        info.method = req.method;
        info.url = req.originalUrl;
        info.ip = req.ip;
        // attach user if present
        info.userId = (req as any).user?.id || "guest";
    }
    if (err instanceof AppError) {
        info.statusCode = err.statusCode;
        info.isOperational = err.isOperational;
        if (err.code) info.code = err.code;
    }
    logger.error(info);
}