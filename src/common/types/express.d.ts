import { Role } from "../../generated/prisma/client.ts";

/**
 * Extend Express Request type to include authenticated user
 */
declare global {
    namespace Express {
        interface Request {
            user?: { id: string; email: string; role: Role; tokenId?: string };
        }
    }
}
