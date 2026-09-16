import { Router } from "express";
import type { Request, Response } from "express";
import { runGitHubDiagnostics } from "../services/github-diagnostic.service.js";

export const diagnosticsRouter = Router();

/**
 * GET /api/diagnostics/github
 * Run GitHub connection and authentication diagnostics using environment variables
 */
diagnosticsRouter.get("/diagnostics/github", async (req: Request, res: Response) => {
  try {
    const repository = typeof req.query.repo === "string" ? req.query.repo : undefined;
    const branch = typeof req.query.branch === "string" ? req.query.branch : undefined;

    const report = await runGitHubDiagnostics({
      repository,
      branch,
    });

    res.json(report);
  } catch (err: any) {
    res.status(500).json({
      error: "Diagnostics execution failed",
      message: err.message,
    });
  }
});

/**
 * POST /api/diagnostics/github
 * Run GitHub diagnostics with custom parameters (token is masked in all logs and outputs)
 */
diagnosticsRouter.post("/diagnostics/github", async (req: Request, res: Response) => {
  try {
    const { token, repository, branch } = req.body || {};

    const report = await runGitHubDiagnostics({
      token,
      repository,
      branch,
    });

    res.json(report);
  } catch (err: any) {
    res.status(500).json({
      error: "Diagnostics execution failed",
      message: err.message,
    });
  }
});
