import { Request, RequestHandler, Response } from "express";
import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";
import NotificationService from "./notification.service.ts";
import prisma from "../../common/config/prisma.ts";

class NotificationController {
    /**
     * Get all notifications for the authenticated user
     */
    getNotifications: RequestHandler = asyncHandler(
        async (req: Request, res: Response): Promise<void> => {
            const userId = req.user?.id;
            const { seen, read, limit, page } = req.query;

            const options: any = {};

            if (seen !== undefined) options.seen = seen === "true";
            if (read !== undefined) options.read = read === "true";
            if (limit) options.limit = parseInt(limit as string, 10);
            if (page) options.page = parseInt(page as string, 10);

            const result = await NotificationService.getUserNotifications(
                userId!,
                options
            );

            res.status(StatusCodes.OK).json(result);
        }
    );

    /**
     * Mark a notification as seen
     */
    markAsSeen: RequestHandler = asyncHandler(
        async (req: Request, res: Response): Promise<void> => {
            const userId = req.user?.id;
            const { id } = req.params;

            // Verify the notification belongs to the user
            const notification = await prisma.notification.findFirst({
                where: {
                    id,
                    recipientId: userId,
                },
            });

            if (!notification) {
                res.status(StatusCodes.NOT_FOUND).json({
                    message: "Notification not found",
                });
                return;
            }

            const result = await NotificationService.markAsSeen(id);

            res.status(StatusCodes.OK).json(result);
        }
    );

    /**
     * Mark a notification as read
     */
    markAsRead: RequestHandler = asyncHandler(
        async (req: Request, res: Response): Promise<void> => {
            const userId = req.user?.id;
            const { id } = req.params;

            // Verify the notification belongs to the user
            const notification = await prisma.notification.findFirst({
                where: {
                    id,
                    recipientId: userId,
                },
            });

            if (!notification) {
                res.status(StatusCodes.NOT_FOUND).json({
                    message: "Notification not found",
                });
                return;
            }

            const result = await NotificationService.markAsRead(id);

            res.status(StatusCodes.OK).json(result);
        }
    );

    /**
     * Mark all notifications as seen
     */
    markAllAsSeen: RequestHandler = asyncHandler(
        async (req: Request, res: Response): Promise<void> => {
            const userId = req.user?.id;

            const result = await NotificationService.markAllAsSeen(userId!);

            res.status(StatusCodes.OK).json({
                message: `${result.count} notifications marked as seen`,
                count: result.count,
            });
        }
    );
}

export default new NotificationController();
