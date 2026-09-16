// ─── Protheus Proxy Helper ────────────────────────────────
// Factory that creates Express handlers to transparently proxy
// requests to Protheus REST API endpoints.

import type { Request, Response } from "express";
import { protheusRequest, ProtheusApiError } from "./protheus-client.js";
import { logger } from "./logger.js";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/**
 * Creates an Express handler that proxies to a Protheus REST endpoint.
 *
 * Path params (e.g. `:id`) in the template are replaced with `req.params`.
 * Query string is forwarded as-is. Body is forwarded for POST/PUT/PATCH.
 *
 * @param pathTemplate - Protheus path with Express-style params (e.g. `/api/vendas/clientes/v1/:id`)
 * @param methodOverride - Override HTTP method (e.g. frontend sends PATCH → Protheus expects PUT)
 */
export function proxy(pathTemplate: string, methodOverride?: HttpMethod) {
  return async (req: Request, res: Response): Promise<void> => {
    const requestId = req.headers["x-request-id"] as string;

    // Replace :param placeholders with actual values
    let path = pathTemplate;
    for (const [key, val] of Object.entries(req.params)) {
      path = path.replace(`:${key}`, encodeURIComponent(val as string));
    }

    // Forward query string
    const qs = new URLSearchParams(req.query as Record<string, string>).toString();
    if (qs) path += `?${qs}`;

    const method = methodOverride ?? (req.method as HttpMethod);
    const hasBody = ["POST", "PUT", "PATCH"].includes(method);

    try {
      const data = await protheusRequest({
        method,
        path,
        body: hasBody ? req.body : undefined,
      });

      res.json(data);
    } catch (err) {
      const status = err instanceof ProtheusApiError ? err.status : 500;
      const message = err instanceof Error ? err.message : "Erro interno";
      logger.error({ err, method, path }, "Proxy to Protheus failed");
      res.status(status).json({ success: false, error: message, requestId });
    }
  };
}
