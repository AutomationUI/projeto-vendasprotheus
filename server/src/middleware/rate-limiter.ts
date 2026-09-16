import rateLimit from "express-rate-limit";
import { env } from "../config/env.js";

export const rateLimiter = rateLimit({
  windowMs: env.rateLimit.windowMs,
  max: env.rateLimit.max,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    error: "Muitas requisições. Tente novamente em alguns segundos.",
  },
  validate: { xForwardedForHeader: false, ip: false },
});

