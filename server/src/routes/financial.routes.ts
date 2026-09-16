import { Router, type Request, type Response, type NextFunction } from "express";
import { FinancialController } from "../controllers/financial.controller.js";

const router = Router();

// ─── Middleware: injetar organizationId do header ─────────────────────────────
router.use((req: Request, res: Response, next: NextFunction): void => {
  const orgId = req.headers["x-organization-id"] as string | undefined;
  if (!orgId) {
    res.status(400).json({
      success: false,
      error: "Parâmetro obrigatório ausente: X-Organization-Id",
    });
    return;
  }
  ;(req as any).organizationId = orgId;
  next();
});

router.get("/titles", FinancialController.getTitles);
router.post("/titles", FinancialController.createTitle);
router.get("/metrics", FinancialController.getMetrics);
router.get("/cash-flow", FinancialController.getCashFlow);
router.post("/titles/:id/settle", FinancialController.settleTitle);

router.get("/credit-analysis", FinancialController.getCreditAnalysis);
router.patch("/credit-analysis/:clienteId", FinancialController.updateCreditAnalysis);

router.get("/collections", FinancialController.getCollections);
router.post("/collections", FinancialController.addCollection);

router.get("/reconciliations", FinancialController.getReconciliations);
router.post("/reconciliations/:id/match", FinancialController.matchReconciliation);

export default router;
