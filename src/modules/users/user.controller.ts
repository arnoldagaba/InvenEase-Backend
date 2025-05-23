import { Request, RequestHandler, Response } from "express";
import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";
import { UserService } from "./user.service.ts";

const userService = new UserService();

export class UserController {
    createUser: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
        const user = await userService.createUser(req.body);
        res.status(StatusCodes.CREATED).json({
            status: "success",
            data: user,
        });
    });

    getUsers: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const search = req.query.search as string;

        const result = await userService.getUsers(page, limit, search);
        res.status(StatusCodes.OK).json({
            status: "success",
            ...result,
        });
    });

    getUserById: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
        const user = await userService.getUserById(req.params.id);
        res.status(StatusCodes.OK).json({
            status: "success",
            data: user,
        });
    });

    updateUser: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
        const user = await userService.updateUser(req.params.id, req.body);
        res.status(StatusCodes.OK).json({
            status: "success",
            data: user,
        });
    });

    deleteUser: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
        await userService.deleteUser(req.params.id);
        res.status(StatusCodes.NO_CONTENT).json({
            status: "success",
            data: null,
        });
    });

    toggleUserStatus: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
        const user = await userService.toggleUserStatus(req.params.id);
        res.status(StatusCodes.OK).json({
            status: "success",
            data: user,
        });
    });

    getUserActivity: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;

        const result = await userService.getUserActivity(req.params.id, page, limit);
        res.status(StatusCodes.OK).json({
            status: "success",
            ...result,
        });
    });
}
