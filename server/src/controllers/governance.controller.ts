import { Request, Response, NextFunction } from "express";
import { GovernanceService } from "../services/governance.service";

// Singleton do serviço de governança (offline-first)
const governance = new GovernanceService();

function getOrgId(req: Request): string {
  return (req as any).organizationId as string;
}

function getRepId(req: Request): string | undefined {
  return (req.headers["x-representative-id"] as string | undefined) || undefined;
}

export class GovernanceController {
  // ── Representantes ────────────────────────────────────────────────────
  public static async listRepresentatives(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.json({ success: true, data: governance.listRepresentatives(getOrgId(req)) });
    } catch (err) {
      next(err);
    }
  }

  public static async saveRepresentative(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rep = governance.saveRepresentative(getOrgId(req), { ...req.body, organizationId: getOrgId(req) });
      res.json({ success: true, data: rep });
    } catch (err) {
      next(err);
    }
  }

  // ── Carteiras ─────────────────────────────────────────────────────────
  public static async listPortfolios(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.json({ success: true, data: governance.listPortfolios(getOrgId(req), getRepId(req)) });
    } catch (err) {
      next(err);
    }
  }

  public static async savePortfolio(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const portfolio = governance.savePortfolio(getOrgId(req), { ...req.body, organizationId: getOrgId(req) });
      res.json({ success: true, data: portfolio });
    } catch (err) {
      next(err);
    }
  }

  // ── Acesso a produtos ─────────────────────────────────────────────────
  public static async listProductAccess(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.json({ success: true, data: governance.listProductAccess(getOrgId(req), getRepId(req)) });
    } catch (err) {
      next(err);
    }
  }

  public static async saveProductAccess(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const access = governance.saveProductAccess(getOrgId(req), { ...req.body, organizationId: getOrgId(req) });
      res.json({ success: true, data: access });
    } catch (err) {
      next(err);
    }
  }

  // ── Regras ────────────────────────────────────────────────────────────
  public static async listRules(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.json({ success: true, data: governance.listRules(getOrgId(req)) });
    } catch (err) {
      next(err);
    }
  }

  public static async saveRule(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rule = governance.saveRule(getOrgId(req), { ...req.body, organizationId: getOrgId(req) });
      res.json({ success: true, data: rule });
    } catch (err) {
      next(err);
    }
  }

  public static async changeRuleStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      const { status } = req.body;
      const rule = governance.changeRuleStatus(getOrgId(req), id, status);
      res.json({ success: true, data: rule });
    } catch (err) {
      next(err);
    }
  }

  public static async createRuleVersion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      const rule = governance.createRuleVersion(getOrgId(req), id, req.body);
      res.json({ success: true, data: rule });
    } catch (err) {
      next(err);
    }
  }

  // ── Políticas de comissão ─────────────────────────────────────────────
  public static async listPolicies(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.json({ success: true, data: governance.listPolicies(getOrgId(req)) });
    } catch (err) {
      next(err);
    }
  }

  public static async savePolicy(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const policy = governance.savePolicy(getOrgId(req), { ...req.body, organizationId: getOrgId(req) });
      res.json({ success: true, data: policy });
    } catch (err) {
      next(err);
    }
  }

  // ── Cálculo oficial de comissão ───────────────────────────────────────
  public static async calculateCommission(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { policyId, representativeId, input, metadata } = req.body as {
        policyId: string;
        representativeId: string;
        input: any;
        metadata: { pedidoId?: string; orcamentoId?: string; faturaId?: string; clienteId: string };
      };
      if (!policyId || !representativeId || !input || !metadata?.clienteId) {
        res.status(400).json({ success: false, error: "policyId, representativeId, input e metadata.clienteId são obrigatórios" });
        return;
      }
      const calc = governance.calculateCommission(getOrgId(req), policyId, representativeId, input, metadata);
      res.json({ success: true, data: calc });
    } catch (err) {
      next(err);
    }
  }

  public static async listCalculations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.json({ success: true, data: governance.listCalculations(getOrgId(req), getRepId(req)) });
    } catch (err) {
      next(err);
    }
  }

  // ── Documentos ────────────────────────────────────────────────────────
  public static async listDocuments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.json({ success: true, data: governance.listDocuments(getOrgId(req)) });
    } catch (err) {
      next(err);
    }
  }

  public static async saveDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const doc = governance.saveDocument(getOrgId(req), { ...req.body, organizationId: getOrgId(req) });
      res.json({ success: true, data: doc });
    } catch (err) {
      next(err);
    }
  }

  // ── Metas e Campanhas ─────────────────────────────────────────────────
  public static async listGoals(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.json({ success: true, data: governance.listGoals(getOrgId(req), getRepId(req)) });
    } catch (err) {
      next(err);
    }
  }

  public static async saveGoal(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const goal = governance.saveGoal(getOrgId(req), { ...req.body, organizationId: getOrgId(req) });
      res.json({ success: true, data: goal });
    } catch (err) {
      next(err);
    }
  }

  public static async listCampaigns(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.json({ success: true, data: governance.listCampaigns(getOrgId(req)) });
    } catch (err) {
      next(err);
    }
  }

  public static async saveCampaign(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const campaign = governance.saveCampaign(getOrgId(req), { ...req.body, organizationId: getOrgId(req) });
      res.json({ success: true, data: campaign });
    } catch (err) {
      next(err);
    }
  }
}