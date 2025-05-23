import client from "prom-client";
import logger from "../utils/logger";

// Create a Registry to register metrics
const register = new client.Registry();

// Add default metrics (CPU, memory, etc.)
client.collectDefaultMetrics({
    app: "invenease-server",
    prefix: "invenease_",
    timeout: 10000,
    register,
});

// Custom metrics
const httpRequestDuration = new client.Histogram({
    name: "invenease_http_request_duration_seconds",
    help: "Duration of HTTP requests in seconds",
    labelNames: ["method", "route", "status_code"],
    buckets: [0.1, 0.5, 1, 2, 5],
    registers: [register],
});

const socketConnections = new client.Gauge({
    name: "invenease_socket_connections",
    help: "Number of active socket connections",
    registers: [register],
});

const socketEvents = new client.Counter({
    name: "invenease_socket_events_total",
    help: "Total number of socket events",
    labelNames: ["event_type"],
    registers: [register],
});

const notificationCounter = new client.Counter({
    name: "invenease_notifications_total",
    help: "Total number of notifications sent",
    labelNames: ["type"],
    registers: [register],
});

// Database metrics
const dbQueryDuration = new client.Histogram({
    name: "invenease_db_query_duration_seconds",
    help: "Duration of database queries in seconds",
    labelNames: ["operation", "table"],
    buckets: [0.01, 0.05, 0.1, 0.5, 1],
    registers: [register],
});

// Error metrics
const errorCounter = new client.Counter({
    name: "invenease_errors_total",
    help: "Total number of errors",
    labelNames: ["type", "source"],
    registers: [register],
});

// Register all metrics
register.registerMetric(httpRequestDuration);
register.registerMetric(socketConnections);
register.registerMetric(socketEvents);
register.registerMetric(notificationCounter);
register.registerMetric(dbQueryDuration);
register.registerMetric(errorCounter);

// Helper functions for metrics
export const metrics = {
    // HTTP metrics
    recordHttpRequest: (method: string, route: string, statusCode: number, duration: number) => {
        httpRequestDuration.labels(method, route, statusCode.toString()).observe(duration);
    },

    // Socket metrics
    updateSocketConnections: (count: number) => {
        socketConnections.set(count);
    },

    recordSocketEvent: (eventType: string) => {
        socketEvents.labels(eventType).inc();
    },

    // Notification metrics
    recordNotification: (type: string) => {
        notificationCounter.labels(type).inc();
    },

    // Database metrics
    recordDbQuery: (operation: string, table: string, duration: number) => {
        dbQueryDuration.labels(operation, table).observe(duration);
    },

    // Error metrics
    recordError: (type: string, source: string) => {
        errorCounter.labels(type, source).inc();
    },

    // Get metrics for Prometheus
    getMetrics: async () => {
        try {
            return await register.metrics();
        } catch (error) {
            logger.error("Error getting metrics:", error);
            throw error;
        }
    },
};
