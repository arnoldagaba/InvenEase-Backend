import { Role } from "../../generated/prisma/client.ts";

export interface TokenPayload {
    userId: string;
    email: string;
    role: Role;
    type: "access" | "refresh";
}

export interface EmailVerificationData {
    email: string;
    userId: string;
}

export interface PasswordResetData {
    userId: string;
    email: string;
}

export interface LoginResponse {
    user: {
        id: string;
        email: string;
        name: string;
        role: Role;
    };
    accessToken: string;
}

export type TokenInfo = {
    token: string;
    expiresAt: Date;
};
