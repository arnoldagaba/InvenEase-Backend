import { Router } from "express";
import notificationRoutes from "../notifications/notification.routes.ts";

const router: Router = Router();

router.use("/notifications", notificationRoutes);

export default router;
