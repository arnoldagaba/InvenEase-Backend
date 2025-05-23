import server from "./app.ts";
import config from "./common/config/env.ts";
import logger from "./common/utils/logger.ts";

const PORT = config.server.port;
server.listen(PORT, () => {
    logger.info(`Server running on port ${PORT} in ${config.server.environment} mode`);
    logger.info(`Browse to http://localhost:${PORT}`);
});

// process events
process.on("uncaughtException", (err) => {
    logger.error({ msg: "UNCAUGHT EXCEPTION", error: err });
    process.exit(1);
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
process.on("unhandledRejection", (reason: any) => {
    logger.error({ msg: "UNHANDLED REJECTION", error: reason });
    server.close(() => process.exit(1));
});

process.on("SIGTERM", () => {
    logger.info("SIGTERM received, shutting down");
    server.close(() => process.exit(0));
});
