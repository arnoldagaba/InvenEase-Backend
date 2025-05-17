import { PrismaClient } from "../../generated/prisma/client.ts";
import logger from "../utils/logger.ts";

const prisma = new PrismaClient({
    log: [
        {
            emit: "event",
            level: "query",
        },
        {
            emit: "event",
            level: "error",
        },
        {
            emit: "event",
            level: "info",
        },
        {
            emit: "event",
            level: "warn",
        },
    ],
});

// Set up Prisma logging events
prisma.$on("query", (e) => {
    logger.debug({
        message: `Database query executed`,
        query: e.query,
        params: e.params,
        duration: `${e.duration}ms`,
    });
});

prisma.$on("error", (e) => {
    logger.error({
        message: `Database error occurred`,
        error: e,
    });
});

prisma.$on("info", (e) => {
    logger.info({
        message: `Database info`,
        details: e,
    });
});

prisma.$on("warn", (e) => {
    logger.warn({
        message: `Database warning`,
        details: e,
    });
});

export default prisma;
