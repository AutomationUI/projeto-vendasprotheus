import type { Request, Response, NextFunction } from "express";
import { type ZodSchema, ZodError } from "zod";

type ValidationTarget = "body" | "params" | "query";

export function validate(schema: ZodSchema, target: ValidationTarget = "body") {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);

    if (!result.success) {
      const errors = result.error.errors.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      }));

      res.status(400).json({
        success: false,
        error: "Dados inválidos",
        details: errors,
        requestId: req.headers["x-request-id"],
      });
      return;
    }

    // Replace with parsed (coerced/defaulted) data
    if (target === "body") req.body = result.data;
    if (target === "params") (req as Request & { validatedParams: unknown }).validatedParams = result.data;
    if (target === "query") (req as Request & { validatedQuery: unknown }).validatedQuery = result.data;

    next();
  };
}
