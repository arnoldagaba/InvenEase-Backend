import bcrypt from "bcryptjs";
import { StatusCodes } from "http-status-codes";
import { Role, Token, TokenType } from "../../generated/prisma/client.ts";
import prisma from "../../common/config/prisma.ts";
import { generateToken } from "../../common/config/jwt.ts";
import config from "../../common/config/env.ts";
import logger from "../../common/utils/logger.ts";
import { AppError } from "../../common/utils/errorHandler.ts";
import emailService from "../../common/utils/email.ts";

/**
 * User registration service
 */
export const register = async (
    email: string,
    password: string,
    name: string,
    role: Role = Role.STAFF,
    phone?: string
) => {
    // Check if the user exists already
    const existingUser = await prisma.user.findUnique({
        where: { email },
    });
    if (existingUser) {
        throw new AppError(
            "User with this email already exists",
            StatusCodes.CONFLICT
        );
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the new user
    const user = await prisma.user.create({
        data: {
            email,
            password: hashedPassword,
            name,
            role,
            phone,
            isActive: true,
        },
    });

    // Generate verification token
    const { token: verificationToken, expiresAt } = generateToken(
        { userId: user.id, email: user.email, role: user.role },
        TokenType.EMAIL_VERIFICATION
    );

    // Store token in database
    await prisma.token.create({
        data: {
            token: verificationToken,
            type: TokenType.EMAIL_VERIFICATION,
            userId: user.id,
            expiresAt,
        },
    });

    const verificationEmail = `${config.frontend.url}/verify-email?token=${verificationToken}`;

    // Send verification email
    await emailService.sendVerificationEmail(user.email, verificationEmail);

    // Return user (without password) and token
    const { password: _, ...userWithoutPassword } = user;

    return userWithoutPassword;
};

/**
 * User login service
 */
export const login = async (
    email: string,
    password: string,
    ipAddress?: string,
    deviceInfo?: string,
    rememberMe = false
) => {
    // Find user by email
    const user = await prisma.user.findUnique({
        where: { email },
    });

    // Check if user exists
    if (!user) {
        throw new AppError(
            "Invalid email or password",
            StatusCodes.UNAUTHORIZED
        );
    }

    // Check if user is active
    if (!user.isActive) {
        throw new AppError("Account is inactive", StatusCodes.UNAUTHORIZED);
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
        throw new AppError(
            "Invalid email or password",
            StatusCodes.UNAUTHORIZED
        );
    }

    // Check if user is verified
    if (!user.isVerified) {
        throw new AppError("Verify your email first", StatusCodes.FORBIDDEN);
    }

    // Generate access token
    const { token: accessToken, expiresAt: accessExpiresAt } = generateToken(
        { userId: user.id, email: user.email, role: user.role },
        TokenType.ACCESS
    );

    // Create access token record in database
    const accessTokenRecord = await prisma.token.create({
        data: {
            token: accessToken,
            type: TokenType.ACCESS,
            userId: user.id,
            expiresAt: accessExpiresAt,
            ipAddress,
            deviceInfo,
            lastUsed: new Date(),
        },
    });

    // Generate refresh token if remember me is enabled
    let refreshToken: string | undefined;
    let refreshTokenRecord: Token | undefined;

    if (rememberMe) {
        const { token, expiresAt } = generateToken(
            {
                userId: user.id,
                email: user.email,
                role: user.role,
                tokenId: accessTokenRecord.id,
            },
            TokenType.REFRESH
        );

        refreshToken = token;
        refreshTokenRecord = await prisma.token.create({
            data: {
                token: refreshToken,
                type: TokenType.REFRESH,
                userId: user.id,
                expiresAt,
                ipAddress,
                deviceInfo,
                lastUsed: new Date(),
            },
        });
    }

    // Update user's last login
    await prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() },
    });

    // Create activity log
    await prisma.activityLog.create({
        data: {
            entityType: "User",
            entityId: user.id,
            action: "LOGIN",
            userId: user.id,
            ipAddress,
            userAgent: deviceInfo,
            details: {
                method: "password",
            },
        },
    });

    // Return user (without password) and tokens
    const { password: _, ...userWithoutPassword } = user;
    return {
        user: userWithoutPassword,
        accessToken,
        accessTokenExpiry: accessExpiresAt,
        refreshToken,
        refreshTokenExpiry: refreshTokenRecord?.expiresAt,
    };
};

/**
 * Refresh token service
 */
export const refreshToken = async (
    refreshTokenStr: string,
    ipAddress?: string,
    deviceInfo?: string
) => {
    if (!refreshTokenStr) {
        throw new AppError(
            "Refresh token is required",
            StatusCodes.BAD_REQUEST
        );
    }

    // Find token in database
    const tokenRecord = await prisma.token.findUnique({
        where: { token: refreshTokenStr },
    });

    // Check if token exists and is valid
    if (
        !tokenRecord ||
        tokenRecord.type !== TokenType.REFRESH ||
        tokenRecord.invalidated
    ) {
        throw new AppError("Invalid refresh token", StatusCodes.UNAUTHORIZED);
    }

    // Check if token is expired
    if (new Date() > tokenRecord.expiresAt) {
        // Invalidate token
        await prisma.token.update({
            where: { id: tokenRecord.id },
            data: { invalidated: true },
        });
        throw new AppError("Refresh token expired", StatusCodes.UNAUTHORIZED);
    }

    // Get user
    const user = await prisma.user.findUnique({
        where: { id: tokenRecord.userId },
    });

    if (!user || !user.isActive) {
        throw new AppError(
            "User not found or inactive",
            StatusCodes.UNAUTHORIZED
        );
    }

    // Generate new access token
    const { token: newAccessToken, expiresAt: accessExpiresAt } = generateToken(
        { userId: user.id, email: user.email, role: user.role },
        TokenType.ACCESS
    );

    // Create new access token record
    const accessTokenRecord = await prisma.token.create({
        data: {
            token: newAccessToken,
            type: TokenType.ACCESS,
            userId: user.id,
            expiresAt: accessExpiresAt,
            ipAddress,
            deviceInfo,
            lastUsed: new Date(),
        },
    });

    // Generate new refresh token
    const { token: newRefreshToken, expiresAt: refreshExpiresAt } =
        generateToken(
            {
                userId: user.id,
                email: user.email,
                role: user.role,
                tokenId: accessTokenRecord.id,
            },
            TokenType.REFRESH
        );

    // Create new refresh token record
    const refreshTokenRecord = await prisma.token.create({
        data: {
            token: newRefreshToken,
            type: TokenType.REFRESH,
            userId: user.id,
            expiresAt: refreshExpiresAt,
            ipAddress,
            deviceInfo,
            lastUsed: new Date(),
        },
    });

    // Invalidate old refresh token
    await prisma.token.update({
        where: { id: tokenRecord.id },
        data: { invalidated: true },
    });

    // Update last used time for both tokens
    await prisma.token.updateMany({
        where: {
            id: {
                in: [accessTokenRecord.id, refreshTokenRecord.id],
            },
        },
        data: { lastUsed: new Date() },
    });

    // Log token refresh
    await prisma.activityLog.create({
        data: {
            entityType: "User",
            entityId: user.id,
            action: "TOKEN_REFRESH",
            userId: user.id,
            ipAddress,
            userAgent: deviceInfo,
        },
    });

    return {
        accessToken: newAccessToken,
        accessTokenExpiry: accessExpiresAt,
        refreshToken: newRefreshToken,
        refreshTokenExpiry: refreshExpiresAt,
    };
};

/**
 * Logout service
 */
export const logout = async (
    userId: string,
    tokenId?: string,
    allDevices = false
) => {
    if (!userId) {
        throw new AppError("User not authenticated", StatusCodes.UNAUTHORIZED);
    }

    // If logging out from all devices
    if (allDevices) {
        // Invalidate all tokens for the user
        await prisma.token.updateMany({
            where: {
                userId,
                invalidated: false,
                type: {
                    in: [TokenType.ACCESS, TokenType.REFRESH],
                },
            },
            data: { invalidated: true },
        });

        // Log all devices logout
        await prisma.activityLog.create({
            data: {
                entityType: "User",
                entityId: userId,
                action: "LOGOUT_ALL",
                userId,
            },
        });

        return { success: true, message: "Logged out from all devices" };
    }

    // If logging out from current device only (with a specific token)
    if (tokenId) {
        // Get the token
        const token = await prisma.token.findUnique({
            where: { id: tokenId },
        });

        if (!token || token.userId !== userId) {
            throw new AppError("Invalid token", StatusCodes.UNAUTHORIZED);
        }

        // Invalidate this token and any related refresh tokens
        await prisma.token.updateMany({
            where: {
                OR: [
                    { id: tokenId },
                    // Also invalidate refresh tokens that reference this token ID
                    {
                        type: TokenType.REFRESH,
                        userId,
                        token: {
                            contains: tokenId, // This assumes token ID is stored in the refresh token
                        },
                    },
                ],
            },
            data: { invalidated: true },
        });

        // Log single device logout
        await prisma.activityLog.create({
            data: {
                entityType: "User",
                entityId: userId,
                action: "LOGOUT",
                userId,
            },
        });

        return { success: true, message: "Logged out successfully" };
    }

    throw new AppError("Token ID required for logout", StatusCodes.BAD_REQUEST);
};

/**
 * Forgot password service - sends password reset email
 */
export const forgotPassword = async (email: string) => {
    // Find user by email
    const user = await prisma.user.findUnique({
        where: { email },
    });

    // For security, don't reveal if user exists or not
    if (!user || !user.isActive) {
        logger.debug(
            `Password reset requested for non-existent or inactive user: ${email}`
        );
        // Still return success to prevent email enumeration
        return {
            success: true,
            message:
                "If your email is registered, you will receive a password reset link",
        };
    }

    // Generate password reset token
    const { token: resetToken, expiresAt } = generateToken(
        { userId: user.id, email: user.email, role: user.role },
        TokenType.PASSWORD_RESET
    );

    // Store token in database
    await prisma.token.create({
        data: {
            token: resetToken,
            type: TokenType.PASSWORD_RESET,
            userId: user.id,
            expiresAt,
        },
    });

    // Create reset password link
    const resetEmail = `${config.frontend.url}/reset-password?token=${resetToken}`;

    // Send password reset email
    await emailService.sendPasswordResetEmail(user.email, resetEmail);

    // Log password reset request
    await prisma.activityLog.create({
        data: {
            entityType: "User",
            entityId: user.id,
            action: "PASSWORD_RESET_REQUEST",
            userId: user.id,
        },
    });

    return {
        success: true,
        message:
            "If your email is registered, you will receive a password reset link",
    };
};

/**
 * Reset password service using token
 */
export const resetPassword = async (
    token: string,
    newPassword: string,
    confirmPassword: string
) => {
    // Find token in database
    const tokenRecord = await prisma.token.findUnique({
        where: { token },
    });

    // Check if token exists and is valid
    if (
        !tokenRecord ||
        tokenRecord.type !== TokenType.PASSWORD_RESET ||
        tokenRecord.invalidated
    ) {
        throw new AppError(
            "Invalid or expired password reset token",
            StatusCodes.UNAUTHORIZED
        );
    }

    // Check if token is expired
    if (new Date() > tokenRecord.expiresAt) {
        // Invalidate token
        await prisma.token.update({
            where: { id: tokenRecord.id },
            data: { invalidated: true },
        });
        throw new AppError(
            "Password reset token has expired",
            StatusCodes.UNAUTHORIZED
        );
    }

    if (newPassword !== confirmPassword) {
        throw new AppError("Passwords do not match", StatusCodes.BAD_REQUEST);
    }

    // Get user
    const user = await prisma.user.findUnique({
        where: { id: tokenRecord.userId },
    });

    if (!user || !user.isActive) {
        throw new AppError("User not found or inactive", StatusCodes.NOT_FOUND);
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user's password
    await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
    });

    // Invalidate the used token
    await prisma.token.update({
        where: { id: tokenRecord.id },
        data: { invalidated: true },
    });

    // Invalidate all existing access and refresh tokens for security
    await prisma.token.updateMany({
        where: {
            userId: user.id,
            type: { in: [TokenType.ACCESS, TokenType.REFRESH] },
            invalidated: false,
        },
        data: { invalidated: true },
    });

    // Log password reset
    await prisma.activityLog.create({
        data: {
            entityType: "User",
            entityId: user.id,
            action: "PASSWORD_RESET",
            userId: user.id,
        },
    });

    return { success: true, message: "Password has been reset successfully" };
};

/**
 * Change password service for authenticated users
 */
export const changePassword = async (
    userId: string,
    currentPassword: string,
    newPassword: string,
    confirmPassword: string
) => {
    if (!userId) {
        throw new AppError("User not authenticated", StatusCodes.UNAUTHORIZED);
    }

    // Get user
    const user = await prisma.user.findUnique({
        where: { id: userId },
    });

    if (!user) {
        throw new AppError("User not found", StatusCodes.NOT_FOUND);
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(
        currentPassword,
        user.password
    );
    if (!isPasswordValid) {
        throw new AppError(
            "Current password is incorrect",
            StatusCodes.UNAUTHORIZED
        );
    }

    // Check if new password is different from current
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
        throw new AppError(
            "New password must be different from current password",
            StatusCodes.BAD_REQUEST
        );
    }
    if (newPassword !== confirmPassword) {
        throw new AppError(
            "Please confirm the new password",
            StatusCodes.BAD_REQUEST
        );
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user's password
    await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
    });

    // Log password change
    await prisma.activityLog.create({
        data: {
            entityType: "User",
            entityId: userId,
            action: "PASSWORD_CHANGE",
            userId,
        },
    });

    return { success: true, message: "Password changed successfully" };
};

/**
 * Email verification service
 */
export const verifyEmail = async (token: string) => {
    // Find token in database
    const tokenRecord = await prisma.token.findUnique({
        where: { token },
    });

    // Check if token exists and is valid
    if (
        !tokenRecord ||
        tokenRecord.type !== TokenType.EMAIL_VERIFICATION ||
        tokenRecord.invalidated
    ) {
        throw new AppError(
            "Invalid or expired verification token",
            StatusCodes.UNAUTHORIZED
        );
    }

    // Check if token is expired
    if (new Date() > tokenRecord.expiresAt) {
        // Invalidate token
        await prisma.token.update({
            where: { id: tokenRecord.id },
            data: { invalidated: true },
        });
        throw new AppError(
            "Verification token has expired",
            StatusCodes.UNAUTHORIZED
        );
    }

    // Get user
    const user = await prisma.user.findUnique({
        where: { id: tokenRecord.userId },
    });

    if (!user) {
        throw new AppError("User not found", StatusCodes.NOT_FOUND);
    }

    // Mark user as verified
    await prisma.user.update({
        where: { id: user.id },
        data: {
            isVerified: true,
        },
    });

    // Invalidate the used token
    await prisma.token.update({
        where: { id: tokenRecord.id },
        data: { invalidated: true },
    });

    // Log email verification
    await prisma.activityLog.create({
        data: {
            entityType: "User",
            entityId: user.id,
            action: "EMAIL_VERIFICATION",
            userId: user.id,
        },
    });

    return { success: true, message: "Email verified successfully" };
};
