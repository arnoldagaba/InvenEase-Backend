import { Router } from "express";
import NotificationController from "./notification.controller.ts";
import { authenticate } from "../../common/middleware/auth.middleware.ts";

const router: Router = Router();

// All notification routes require authentication
router.use(authenticate);

// Get all notifications for the authenticated user
router.get("/", NotificationController.getNotifications);

// Mark all notifications as seen
router.put("/mark-all-seen", NotificationController.markAllAsSeen);

// Mark a notification as seen
router.put("/:id/seen", NotificationController.markAsSeen);

// Mark a notification as read
router.put("/:id/read", NotificationController.markAsRead);

export default router;
