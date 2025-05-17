import prisma from "../../common/config/prisma.ts";
import { NotificationType } from "../../generated/prisma/client.ts";
import { broadcastNotification, sendNotification } from "../../socket.ts";
import logger from "../../common/utils/logger.ts";

class NotificationService {
    /**
     * Create and send a notification to a specific user
     */
    async createNotification(data: {
        type: NotificationType;
        message: string;
        recipientId: string;
        orderId?: string;
        payload?: any;
    }) {
        try {
            return await sendNotification(data);
        } catch (error) {
            logger.error("Error creating notification:", error);
            throw error;
        }
    }

    /**
     * Send notification to multiple users by role
     */
    async notifyByRole(data: {
        type: NotificationType;
        message: string;
        roles: string[];
        orderId?: string;
        payload?: any;
    }) {
        try {
            return await broadcastNotification(
                {
                    type: data.type,
                    message: data.message,
                    orderId: data.orderId,
                    payload: data.payload,
                },
                data.roles
            );
        } catch (error) {
            logger.error("Error sending notification by role:", error);
            throw error;
        }
    }

    /**
     * Send low stock notification
     */
    async sendLowStockNotification(
        productName: string,
        quantity: number,
        warehouseId: string
    ) {
        try {
            // Find warehouse managers to notify
            const warehouse = await prisma.warehouse.findUnique({
                where: { id: warehouseId },
                include: { manager: true },
            });

            if (!warehouse) {
                throw new Error(`Warehouse with ID ${warehouseId} not found`);
            }

            // Also notify all admins
            const admins = await prisma.user.findMany({
                where: { role: "ADMIN", isActive: true },
            });

            const recipientIds = [
                warehouse.managerId,
                ...admins.map((admin) => admin.id),
            ];

            // Remove duplicates
            const uniqueRecipientIds = [...new Set(recipientIds)];

            // Create notifications for each recipient
            const notificationPromises = uniqueRecipientIds.map(
                (recipientId) => {
                    return this.createNotification({
                        type: NotificationType.LOW_STOCK,
                        message: `Low stock alert: ${productName} is down to ${quantity} units in ${warehouse.name}`,
                        recipientId,
                        payload: {
                            productName,
                            quantity,
                            warehouseId,
                            warehouseName: warehouse.name,
                        },
                    });
                }
            );

            return Promise.all(notificationPromises);
        } catch (error) {
            logger.error("Error sending low stock notification:", error);
            throw error;
        }
    }

    /**
     * Send order status notification
     */
    async sendOrderStatusNotification(
        orderId: string,
        status: string,
        recipientId: string
    ) {
        try {
            const order = await prisma.order.findUnique({
                where: { id: orderId },
                include: { supplier: true },
            });

            if (!order) {
                throw new Error(`Order with ID ${orderId} not found`);
            }

            return await this.createNotification({
                type: NotificationType.ORDER_STATUS,
                message: `Order #${order.orderNumber} from ${order.supplier.name} is now ${status}`,
                recipientId,
                orderId,
                payload: {
                    orderNumber: order.orderNumber,
                    status,
                    supplierName: order.supplier.name,
                },
            });
        } catch (error) {
            logger.error("Error sending order status notification:", error);
            throw error;
        }
    }

    /**
     * Get user notifications
     */
    async getUserNotifications(
        userId: string,
        options: {
            seen?: boolean;
            read?: boolean;
            limit?: number;
            page?: number;
        } = {}
    ) {
        const { seen, read, limit = 20, page = 1 } = options;
        const skip = (page - 1) * limit;

        try {
            const where: any = { recipientId: userId };

            if (seen !== undefined) {
                where.seen = seen;
            }

            if (read !== undefined) {
                where.read = read;
            }

            const [notifications, count] = await Promise.all([
                prisma.notification.findMany({
                    where,
                    orderBy: { createdAt: "desc" },
                    skip,
                    take: limit,
                }),
                prisma.notification.count({ where }),
            ]);

            return {
                notifications,
                count,
                pages: Math.ceil(count / limit),
                currentPage: page,
            };
        } catch (error) {
            logger.error("Error fetching user notifications:", error);
            throw error;
        }
    }

    /**
     * Mark notification as seen
     */
    async markAsSeen(notificationId: string) {
        try {
            return await prisma.notification.update({
                where: { id: notificationId },
                data: { seen: true },
            });
        } catch (error) {
            logger.error("Error marking notification as seen:", error);
            throw error;
        }
    }

    /**
     * Mark notification as read
     */
    async markAsRead(notificationId: string) {
        try {
            return await prisma.notification.update({
                where: { id: notificationId },
                data: { seen: true, read: true },
            });
        } catch (error) {
            logger.error("Error marking notification as read:", error);
            throw error;
        }
    }

    /**
     * Mark all notifications as seen for a user
     */
    async markAllAsSeen(userId: string) {
        try {
            return await prisma.notification.updateMany({
                where: {
                    recipientId: userId,
                    seen: false,
                },
                data: { seen: true },
            });
        } catch (error) {
            logger.error("Error marking all notifications as seen:", error);
            throw error;
        }
    }
}

export default new NotificationService();