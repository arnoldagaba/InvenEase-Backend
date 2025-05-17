import { Server as HttpServer } from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import prisma from "./common/config/prisma.ts";
import logger from "./common/utils/logger.ts";
import config from "./common/config/env.ts";
import { Role } from "./generated/prisma/client.ts";

interface SocketUser {
    id: string;
    email: string;
    role: string;
}

// Map to store active user connections
const connectedUsers = new Map<string, string[]>();

export function setupSocketIO(server: HttpServer) {
    const io = new Server(server, {
        cors: {
            origin: config.frontend.url || "http://localhost:5174",
            methods: ["GET", "POST"],
            credentials: true,
        },
    });

    // Authentication middleware
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token;
            if (!token) {
                return next(new Error("Authentication error: Token required"));
            }

            // Verify the token
            const decoded = jwt.verify(
                token,
                config.jwt.socket_secret as string
            ) as SocketUser;
            if (!decoded.id) {
                return next(new Error("Authentication error: Invalid token"));
            }

            // Attach user data to the socket
            socket.data.user = decoded;
            next();
        } catch (error) {
            logger.error("Socket authentication error:", error);
            next(new Error("Authentication error"));
        }
    });

    io.on("connection", (socket) => {
        const userId = socket.data.user.id;

        logger.info(`User connected: ${userId}`);

        // Store the socket ID for this user
        if (connectedUsers.has(userId)) {
            connectedUsers.get(userId)?.push(socket.id);
        } else {
            connectedUsers.set(userId, [socket.id]);
        }

        // Handle client requesting their unseen notifications
        socket.on("get:notifications", async () => {
            try {
                const notifications = await prisma.notification.findMany({
                    where: {
                        recipientId: userId,
                        seen: false,
                    },
                    orderBy: {
                        createdAt: "desc",
                    },
                    take: 50,
                });

                socket.emit("notifications", notifications);
            } catch (error) {
                logger.error("Error fetching notifications:", error);
            }
        });

        // Handle marking notifications as seen
        socket.on("mark:seen", async (notificationId) => {
            try {
                await prisma.notification.update({
                    where: { id: notificationId },
                    data: { seen: true },
                });
            } catch (error) {
                logger.error("Error marking notification as seen:", error);
            }
        });

        // Handle marking notifications as read
        socket.on("mark:read", async (notificationId) => {
            try {
                await prisma.notification.update({
                    where: { id: notificationId },
                    data: { read: true, seen: true },
                });
            } catch (error) {
                logger.error("Error marking notification as read:", error);
            }
        });

        // Handle disconnect
        socket.on("disconnect", () => {
            logger.info(`User disconnected: ${userId}`);

            // Remove the socket ID from the user's connections
            const userSockets = connectedUsers.get(userId) || [];
            const updatedSockets = userSockets.filter((id) => id !== socket.id);

            if (updatedSockets.length === 0) {
                connectedUsers.delete(userId);
            } else {
                connectedUsers.set(userId, updatedSockets);
            }
        });
    });

    return io;
}

// Function to send notification to specific users
export async function sendNotification(notification: any) {
    try {
        // First, save the notification to the database
        const savedNotification = await prisma.notification.create({
            data: notification,
        });

        // Check if the recipient is currently connected
        const recipientSockets = connectedUsers.get(notification.recipientId);

        if (recipientSockets && recipientSockets.length > 0) {
            // Get the Socket.IO server instance
            const io = global.io;

            // Send the notification to all connections of this user
            recipientSockets.forEach((socketId) => {
                io.to(socketId).emit("new:notification", savedNotification);
            });
        }

        return savedNotification;
    } catch (error) {
        logger.error("Error sending notification:", error);
        throw error;
    }
}

// Function to broadcast notifications to all connected users or by role
export async function broadcastNotification(
    notification: any,
    roles?: string[]
) {
    try {
        // For each recipient, create a notification
        let recipients;

        if (roles && roles.length > 0) {
            // Get users with specified roles
            recipients = await prisma.user.findMany({
                where: {
                    role: {
                        in: roles.map(
                            (role) => Role[role as keyof typeof Role]
                        ),
                    },
                    isActive: true,
                },
                select: {
                    id: true,
                },
            });
        } else {
            // Get all active users
            recipients = await prisma.user.findMany({
                where: {
                    isActive: true,
                },
                select: {
                    id: true,
                },
            });
        }

        // Create and send notifications for each recipient
        const notificationPromises = recipients.map((recipient) => {
            const userNotification = {
                ...notification,
                recipientId: recipient.id,
            };

            return sendNotification(userNotification);
        });

        return Promise.all(notificationPromises);
    } catch (error) {
        logger.error("Error broadcasting notification:", error);
        throw error;
    }
}
