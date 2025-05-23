import { Router } from "express";
import authRoutes from "../auth/auth.routes.ts";
import userRoutes from "../users/user.routes.ts";
import notificationRoutes from "../notifications/notification.routes.ts";

const router: Router = Router();

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/notifications", notificationRoutes);

export default router;
