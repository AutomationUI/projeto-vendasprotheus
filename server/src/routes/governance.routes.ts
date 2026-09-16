import { Router, Request, Response, NextFunction } from "express";
import { GovernanceController } from "../controllers/governance.controller";

const router = Router();

// ─── Middleware: injeção do contexto de isolamento (organization_id) ──────
router.use((req: Request, res: Response, next: NextFunction): void => {
  const orgId = req.headers["x-organization-id"] as string | undefined;
  if (!orgId) {
    res.status(400).json({ success: false, error: "Parâmetro obrigatório ausente: X-Organization-Id" });
    return;
  }
  (req as any).organizationId = orgId;
  next();
});

// ─── Representantes ──────────────────────────────────────────────────────
router.get("/representatives", GovernanceController.listRepresentatives);
router.post("/representatives", GovernanceController.saveRepresentative);

// ─── Carteiras ───────────────────────────────────────────────────────────
router.get("/portfolios", GovernanceController.listPortfolios);
router.post("/portfolios", GovernanceController.savePortfolio);

// ─── Acesso a produtos ───────────────────────────────────────────────────
router.get("/product-access", GovernanceController.listProductAccess);
router.post("/product-access", GovernanceController.saveProductAccess);

// ─── Regras comerciais ───────────────────────────────────────────────────
router.get("/rules", GovernanceController.listRules);
router.post("/rules", GovernanceController.saveRule);
router.post("/rules/:id/status", GovernanceController.changeRuleStatus);
router.post("/rules/:id/versions", GovernanceController.createRuleVersion);

// ─── Políticas de comissão ───────────────────────────────────────────────
router.get("/policies", GovernanceController.listPolicies);
router.post("/policies", GovernanceController.savePolicy);

// ─── Comissões ───────────────────────────────────────────────────────────
router.post("/commissions/calculate", GovernanceController.calculateCommission);
router.get("/commissions", GovernanceController.listCalculations);

// ─── Documentos ──────────────────────────────────────────────────────────
router.get("/documents", GovernanceController.listDocuments);
router.post("/documents", GovernanceController.saveDocument);

// ─── Metas e Campanhas ───────────────────────────────────────────────────
router.get("/goals", GovernanceController.listGoals);
router.post("/goals", GovernanceController.saveGoal);
router.get("/campaigns", GovernanceController.listCampaigns);
router.post("/campaigns", GovernanceController.saveCampaign);

export default router;