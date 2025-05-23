import { hash } from "bcryptjs";
import { StatusCodes } from "http-status-codes";
import prisma from "../../common/config/prisma.ts";
import { ActivityLog, Prisma, User } from "../../generated/prisma/client.ts";
import { CreateUserDto, UpdateUserDto } from "./user.validators.ts";
import { AppError } from "../../common/utils/errorHandler.ts";

interface PaginatedUsers {
    users: Omit<User, "password">[];
    total: number;
    page: number;
    totalPages: number;
}

export class UserService {
    async createUser(data: CreateUserDto): Promise<Omit<User, "password">> {
        const existingUser = await prisma.user.findUnique({
            where: { email: data.email },
        });

        if (existingUser) {
            throw new AppError("Email already registered", StatusCodes.CONFLICT);
        }

        const hashedPassword = await hash(data.password, 10);

        const user = await prisma.user.create({
            data: {
                ...data,
                password: hashedPassword,
            },
        });
        if (!user) {
            throw new AppError("User creation failed", StatusCodes.INTERNAL_SERVER_ERROR);
        }

        // Exclude password from the returned user object
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password: _, ...userWithoutPassword } = user;
        return userWithoutPassword;
    }

    async getUsers(page = 1, limit = 10, search?: string): Promise<PaginatedUsers> {
        const skip = (page - 1) * limit;
        const where = search
            ? {
                  OR: [
                      { name: { contains: search, mode: Prisma.QueryMode.insensitive } },
                      { email: { contains: search, mode: Prisma.QueryMode.insensitive } },
                  ],
              }
            : {};

        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: "desc" },
            }),
            prisma.user.count({ where }),
        ]);

        // Exclude password from the returned user objects
        const usersWithoutPassword = users.map(
            ({ password: _, ...userWithoutPassword }) => userWithoutPassword
        );

        return {
            users: usersWithoutPassword,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }

    async getUserById(id: string): Promise<Omit<User, "password">> {
        const user = await prisma.user.findUnique({
            where: { id },
        });

        if (!user) {
            throw new AppError("User not found", StatusCodes.NOT_FOUND);
        }

        // Exclude password from the returned user object
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password: _, ...userWithoutPassword } = user;
        return userWithoutPassword;
    }

    async updateUser(id: string, data: UpdateUserDto): Promise<Omit<User, "password">> {
        const user = await prisma.user.findUnique({
            where: { id },
        });

        if (!user) {
            throw new AppError("User not found", StatusCodes.NOT_FOUND);
        }

        const updatedUser = await prisma.user.update({
            where: { id },
            data: data,
        });
        if (!updatedUser) {
            throw new AppError("User update failed", StatusCodes.INTERNAL_SERVER_ERROR);
        }

        return updatedUser;
    }

    async deleteUser(id: string): Promise<void> {
        const user = await prisma.user.findUnique({
            where: { id },
        });
        if (!user) {
            throw new AppError("User not found", StatusCodes.NOT_FOUND);
        }

        await prisma.user.update({
            where: { id },
            data: {
                deletedAt: new Date(),
                isActive: false,
            },
        });

        return;
    }

    async toggleUserStatus(id: string): Promise<Omit<User, "password">> {
        const user = await prisma.user.findUnique({
            where: { id },
        });
        if (!user) {
            throw new AppError("User not found", StatusCodes.NOT_FOUND);
        }

        const updatedUser = await prisma.user.update({
            where: { id },
            data: {
                isActive: !user.isActive,
            },
        });

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password: _, ...userWithoutPassword } = updatedUser;
        return userWithoutPassword;
    }

    async getUserActivity(
        id: string,
        page = 1,
        limit = 10
    ): Promise<{ activities: ActivityLog[]; total: number; page: number; totalPages: number }> {
        const skip = (page - 1) * limit;

        const [activities, total] = await Promise.all([
            prisma.activityLog.findMany({
                where: { userId: id },
                skip,
                take: limit,
                orderBy: { timestamp: "desc" },
            }),
            prisma.activityLog.count({
                where: { userId: id },
            }),
        ]);

        return {
            activities,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }
}
