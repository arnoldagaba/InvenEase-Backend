import { Request, RequestHandler, Response } from "express";
import { StatusCodes } from "http-status-codes";
import asyncHandler from "express-async-handler";
import * as authService from "./auth.service.ts";
import authConfig from "../../common/config/cookie.ts";

/**
 * Register a new user
 * @route POST /api/auth/register
 */
export const register: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
    const { email, password, name, role, phone } = req.body;
    const user = await authService.register(email, password, name, role, phone);

    res.status(StatusCodes.CREATED).json({
        success: true,
        message: "User registered successfully. Please verify your email.",
        data: user,
    });
});

/**
 * Login user
 * @route POST /api/auth/login
 */
export const login: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
    const { email, password, rememberMe } = req.body;
    const ipAddress = req.ip;
    const deviceInfo = req.headers["user-agent"];

    const result = await authService.login(email, password, ipAddress, deviceInfo, rememberMe);

    res.cookie(authConfig.jwt.access.cookieName, result.accessToken, {
        maxAge: authConfig.jwt.access.cookieMaxAge,
        ...authConfig.cookie,
    });

    res.cookie(authConfig.jwt.refresh.cookieName, result.refreshToken, {
        maxAge: authConfig.jwt.refresh.cookieMaxAge,
        ...authConfig.cookie,
    });

    res.status(StatusCodes.OK).json({
        success: true,
        message: "Login successful",
        data: result.user,
    });
});

/**
 * Refresh access token
 * @route POST /api/auth/refresh-token
 */
export const refreshToken: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
    const refreshToken = req.cookies.refreshToken;
    const ipAddress = req.ip;
    const deviceInfo = req.headers["user-agent"];

    const result = await authService.refreshToken(refreshToken, ipAddress, deviceInfo);

    res.cookie(authConfig.jwt.access.cookieName, result.accessToken, {
        maxAge: authConfig.jwt.access.cookieMaxAge,
        ...authConfig.cookie,
    });

    res.cookie(authConfig.jwt.refresh.cookieName, result.refreshToken, {
        maxAge: authConfig.jwt.refresh.cookieMaxAge,
        ...authConfig.cookie,
    });

    res.status(StatusCodes.OK).json({
        success: true,
        message: "Token refreshed successfully",
    });
});

/**
 * Logout user
 * @route POST /api/auth/logout
 */
export const logout: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const tokenId = req.user?.tokenId;
    const { allDevices = false } = req.body;

    await authService.logout(userId!, tokenId, allDevices);

    // Clear cookies
    res.clearCookie(authConfig.jwt.access.cookieName);
    res.clearCookie(authConfig.jwt.refresh.cookieName);

    res.status(StatusCodes.OK).json({
        success: true,
        message: allDevices ? "Logged out from all devices" : "Logged out successfully",
    });
});

/**
 * Request password reset
 * @route POST /api/auth/forgot-password
 */
export const forgotPassword: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body;

    const result = await authService.forgotPassword(email);

    res.status(StatusCodes.OK).json(result);
});

/**
 * Reset password using token
 * @route POST /api/auth/reset-password
 */
export const resetPassword: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
    const { token, newPassword, confirmPassword } = req.body;

    const result = await authService.resetPassword(token, newPassword, confirmPassword);

    res.status(StatusCodes.OK).json(result);
});

/**
 * Change password (for authenticated users)
 * @route POST /api/auth/change-password
 */
export const changePassword: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { currentPassword, newPassword, confirmPassword } = req.body;

    const result = await authService.changePassword(
        userId!,
        currentPassword,
        newPassword,
        confirmPassword
    );

    res.status(StatusCodes.OK).json(result);
});

/**
 * Verify email using token
 * @route GET /api/auth/verify-email
 */
export const verifyEmail: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.query as { token: string };

    const result = await authService.verifyEmail(token);

    res.status(StatusCodes.OK).json(result);
});

/**
 * Get all active sessions for the current user
 * @route GET /api/auth/sessions
 */
export const getUserSessions: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
    const sessions = await authService.getUserSessions(req.user!.id);
    res.status(StatusCodes.OK).json({
        success: true,
        data: sessions,
    });
});

/**
 * Invalidate a specific session
 * @route DELETE /api/auth/sessions/:sessionId
 */
export const invalidateSession: RequestHandler = asyncHandler(
    async (req: Request, res: Response) => {
        const { sessionId } = req.params;
        const result = await authService.invalidateSession(req.user!.id, sessionId);
        res.status(StatusCodes.OK).json(result);
    }
);

/**
 * Invalidate all other sessions for the current user
 * @route DELETE /api/auth/sessions
 */
export const invalidateOtherSessions: RequestHandler = asyncHandler(
    async (req: Request, res: Response) => {
        const result = await authService.invalidateOtherSessions(req.user!.id, req.user!.tokenId!);
        res.status(StatusCodes.OK).json(result);
    }
);
