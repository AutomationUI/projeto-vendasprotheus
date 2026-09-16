import { Router, Request, Response, NextFunction } from "express";
import { GovernanceController } from "../controllers/governance.controller";
import { GovernanceService } from "../services/governance.service";

const router = Router();
const governance = new GovernanceService();

router.use((req: Request, res: Response, next: NextFunction): void => {
  const orgId = req.headers["x-organization-id"] as string | undefined;
  if (!orgId) {
    res.status(400).json({ success: false, error: "Parâmetro obrigatório ausente: X-Organization-Id" });
    return;
  }
  (req as any).organizationId = orgId;
  next();
});

router.get("/", GovernanceController.listCalculations);
router.post("/calculate", GovernanceController.calculateCommission);

router.post("/:id/status", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = (req as any).organizationId;
    const calcId = req.params.id;
    const { status, responsavel, observacao } = req.body;
    
    const list = governance.listCalculations(orgId);
    const calc = list.find(c => c.id === calcId);
    if (!calc) {
      res.status(404).json({ success: false, error: "Cálculo de comissão não encontrado" });
      return;
    }

    const oldStatus = calc.status;
    calc.status = status;
    calc.updatedAt = new Date().toISOString();
    calc.events.push({
      id: `ev-${Date.now()}`,
      comissaoId: calc.id,
      from: oldStatus,
      to: status,
      responsavel: responsavel || "Sist. Governança",
      observacao,
      dataHora: new Date().toISOString()
    });

    res.json({ success: true, data: calc });
  } catch (err) {
    next(err);
  }
});

export default router;
