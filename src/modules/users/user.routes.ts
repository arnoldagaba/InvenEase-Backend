import { Router } from "express";
import { UserController } from "./user.controller";
import { validateRequest } from "../../middleware/validateRequest";
import { createUserSchema, updateUserSchema } from "./user.validators";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { Role } from "@prisma/client";

const router = Router();
const userController = new UserController();

// Public routes
router.post(
    "/",
    authenticate,
    authorize([Role.ADMIN]),
    validateRequest(createUserSchema),
    userController.createUser
);

// Protected routes
router.use(authenticate);

// Admin only routes
router.get("/", authorize([Role.ADMIN, Role.MANAGER]), userController.getUsers);

router.get("/:id", authorize([Role.ADMIN, Role.MANAGER]), userController.getUserById);

router.patch(
    "/:id",
    authorize([Role.ADMIN]),
    validateRequest(updateUserSchema),
    userController.updateUser
);

router.delete("/:id", authorize([Role.ADMIN]), userController.deleteUser);

router.patch("/:id/toggle-status", authorize([Role.ADMIN]), userController.toggleUserStatus);

router.get("/:id/activity", authorize([Role.ADMIN, Role.MANAGER]), userController.getUserActivity);

export default router;
