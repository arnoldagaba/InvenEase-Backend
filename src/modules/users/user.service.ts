import { PrismaClient } from '@prisma/client';
import { hash } from 'bcrypt';
import { CreateUserDto, UpdateUserDto } from './user.validators';
import { AppError } from '../../utils/appError';
import { StatusCodes } from 'http-status-codes';

const prisma = new PrismaClient();

export class UserService {
  async createUser(data: CreateUserDto) {
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new AppError('Email already registered', StatusCodes.CONFLICT);
    }

    const hashedPassword = await hash(data.password, 10);

    return prisma.user.create({
      data: {
        ...data,
        password: hashedPassword,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        isActive: true,
        isVerified: true,
        createdAt: true,
      },
    });
  }

  async getUsers(page = 1, limit = 10, search?: string) {
    const skip = (page - 1) * limit;
    
    const where = search ? {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ],
    } : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          phone: true,
          isActive: true,
          isVerified: true,
          lastLogin: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      users,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getUserById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        isActive: true,
        isVerified: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new AppError('User not found', StatusCodes.NOT_FOUND);
    }

    return user;
  }

  async updateUser(id: string, data: UpdateUserDto) {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new AppError('User not found', StatusCodes.NOT_FOUND);
    }

    if (data.email && data.email !== user.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email: data.email },
      });

      if (existingUser) {
        throw new AppError('Email already registered', StatusCodes.CONFLICT);
      }
    }

    const updateData: any = { ...data };
    if (data.password) {
      updateData.password = await hash(data.password, 10);
    }

    return prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        isActive: true,
        isVerified: true,
        updatedAt: true,
      },
    });
  }

  async deleteUser(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new AppError('User not found', StatusCodes.NOT_FOUND);
    }

    return prisma.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });
  }

  async toggleUserStatus(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new AppError('User not found', StatusCodes.NOT_FOUND);
    }

    return prisma.user.update({
      where: { id },
      data: {
        isActive: !user.isActive,
      },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
      },
    });
  }

  async getUserActivity(id: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [activities, total] = await Promise.all([
      prisma.activityLog.findMany({
        where: { userId: id },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
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