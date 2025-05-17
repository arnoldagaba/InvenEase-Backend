import { User } from "../../generated/prisma/client.ts";

declare global {
    namespace Express {
        interface Request {
            user?: Pick<User, "id" | "email" | "role">;
        }
    }
}
