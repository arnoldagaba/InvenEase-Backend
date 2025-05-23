import { Request, Response } from "express";
import { UserService } from "./user.service";
import { catchAsync } from "../../utils/catchAsync";
import { AppError } from "../../utils/appError";
import { StatusCodes } from "http-status-codes";

const userService = new UserService();

export class UserController {
    createUser = catchAsync(async (req: Request, res: Response) => {
        const user = await userService.createUser(req.body);
        res.status(StatusCodes.CREATED).json({
            status: "success",
            data: user,
        });
    });

    getUsers = catchAsync(async (req: Request, res: Response) => {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const search = req.query.search as string;

        const result = await userService.getUsers(page, limit, search);
        res.status(StatusCodes.OK).json({
            status: "success",
            ...result,
        });
    });

    getUserById = catchAsync(async (req: Request, res: Response) => {
        const user = await userService.getUserById(req.params.id);
        res.status(StatusCodes.OK).json({
            status: "success",
            data: user,
        });
    });

    updateUser = catchAsync(async (req: Request, res: Response) => {
        const user = await userService.updateUser(req.params.id, req.body);
        res.status(StatusCodes.OK).json({
            status: "success",
            data: user,
        });
    });

    deleteUser = catchAsync(async (req: Request, res: Response) => {
        await userService.deleteUser(req.params.id);
        res.status(StatusCodes.NO_CONTENT).json({
            status: "success",
            data: null,
        });
    });

    toggleUserStatus = catchAsync(async (req: Request, res: Response) => {
        const user = await userService.toggleUserStatus(req.params.id);
        res.status(StatusCodes.OK).json({
            status: "success",
            data: user,
        });
    });

    getUserActivity = catchAsync(async (req: Request, res: Response) => {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;

        const result = await userService.getUserActivity(req.params.id, page, limit);
        res.status(StatusCodes.OK).json({
            status: "success",
            ...result,
        });
    });
}
