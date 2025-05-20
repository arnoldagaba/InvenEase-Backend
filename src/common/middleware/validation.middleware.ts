import { NextFunction, Request, Response } from "express";
import { AnyZodObject, ZodError } from "zod";
import { StatusCodes } from "http-status-codes";
import logger from "../utils/logger.ts";
import { AppError } from "../utils/errorHandler.ts";

/**
 * Middleware to validate request data against a Zod schema
 *
 * @param schema - The Zod schema to validate against
 * @param source - The part of the request to validate (body, query, params)
 */
const validateRequest = (
    schema: AnyZodObject,
    source: "body" | "query" | "params" = "body"
) => {
    return async (req: Request, _res: Response, next: NextFunction) => {
        try {
            // validate the request data against the schema
            const data = await schema.parseAsync(req[source]);

            // Replace the request data with the validated data
            req[source] = data;

            next();
        } catch (error) {
            // Format and log validation errors
            if (error instanceof ZodError) {
                logger.debug("Validation error:", error.errors);

                // // Format the errors in a more user-friendly way
                // const formattedErrors = error.errors.map((err) => ({
                //     field: err.path.join("."),
                //     message: err.message,
                //     code: err.code,
                // }));

                next(new AppError(error.message, StatusCodes.BAD_REQUEST));
            } else {
                // Handle unexpected errors
                next(error);
            }
        }
    };
};

export default validateRequest;
