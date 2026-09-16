import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import FlowStudio from "@/pages/FlowStudio";
import { PageHeader } from "@/components/PageHeader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  Scale,
  Users,
  ShieldCheck,
  Target,
  Plus,
  Search,
  Eye,
  Edit2,
  Calculator,
  CheckCircle2,
  ArrowRight,
  FileText,
  Lock,
  Sparkles,
  History,
  Tag,
  Check,
  Building2,
  GitFork,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { GovernanceFlowSyncPanel } from "@/components/GovernanceFlowSyncPanel";
import { getFlowsConsumingGovernanceRule } from "@/lib/governance-flow-bridge";
import { Link } from "react-router-dom";
const FlowDocumentsModal = React.lazy(() => import("@/components/FlowDocumentsModal").then(m => ({ default: m.FlowDocumentsModal })));
import { governanceService } from "@/lib/api/governance-service";
import type {
  RepresentativeEnvironment,
  CommercialRule,
  CommissionPolicy,
  CommissionCalculation,
  GovernanceDocument,
  Goal,
  CommercialCampaign,
  ConditionField,
  ConditionOperator,
  CommissionReleasePolicy,
  RuleStatus,
  RuleAction,
} from "@/types/governance";

const DEFAULT_ORG = "org-1";

export default function GovernanceStudio() {
  const [searchParams, setSearchParams] = useSearchParams();
  const qTab = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<string>(qTab || "overview");

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [searchParams, activeTab]);

  const handleTabChange = (val: string) => {
    setActiveTab(val);
    setSearchParams({ tab: val }, { replace: true });
  };

  // Data states
  const [reps, setReps] = useState<RepresentativeEnvironment[]>([]);
  const [policies, setPolicies] = useState<CommissionPolicy[]>([]);
  const [rules, setRules] = useState<CommercialRule[]>([]);
  const [documents, setDocuments] = useState<GovernanceDocument[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [campaigns, setCampaigns] = useState<CommercialCampaign[]>([]);
  const [calculations, setCalculations] = useState<CommissionCalculation[]>([]);
  const [portfolios, setPortfolios] = useState<RepresentativePortfolio[]>([]);
  const [productAccess, setProductAccess] = useState<RepresentativeProductAccess[]>([]);
  const [isFlowDocsModalOpen, setIsFlowDocsModalOpen] = useState(false);

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState("");

  // Representative Modal State
  const [repModalOpen, setRepModalOpen] = useState(false);
  const [editingRep, setEditingRep] = useState<RepresentativeEnvironment | null>(null);
  const [repForm, setRepForm] = useState({
    nome: "",
    codigo: "",
    email: "",
    telefone: "",
    regiao: "Sudeste",
    segmentos: "Industrial, Automotivo",
    metaMensal: 100000,
    comissao: 5,
    ativo: true,
  });

  // Rule Modal State
  const [ruleModalOpen, setRuleModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<CommercialRule | null>(null);
  const [ruleForm, setRuleForm] = useState<{
    name: string;
    description: string;
    field: ConditionField;
    operator: ConditionOperator;
    value: string;
    actionType: "bonus" | "comissao" | "exigir_aprovacao" | "bloquear" | "definir_desconto_maximo" | "definir_margem_minima";
    actionValue: number;
    priority: number;
    status: RuleStatus;
  }>({
    name: "",
    description: "",
    field: "margem",
    operator: "gte",
    value: "15",
    actionType: "bonus",
    actionValue: 1.5,
    priority: 10,
    status: "ativa",
  });

  // Policy Modal State
  const [policyModalOpen, setPolicyModalOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<CommissionPolicy | null>(null);
  const [policyForm, setPolicyForm] = useState<{
    name: string;
    comissaoBase: number;
    releasePolicy: CommissionReleasePolicy;
    ruleIds: string[];
    status: RuleStatus;
  }>({
    name: "",
    comissaoBase: 5,
    releasePolicy: "faturamento",
    ruleIds: [],
    status: "publicada",
  });

  // Goal Modal State
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [goalForm, setGoalForm] = useState({
    representativeId: "global",
    tipo: "valor_venda" as Goal["tipo"],
    objetivo: 100000,
    atingido: 0,
    periodoInicio: "2026-09-01",
    periodoFim: "2026-09-30",
  });

  // Document Modal State
  const [docModalOpen, setDocModalOpen] = useState(false);
  const [docForm, setDocForm] = useState({
    title: "",
    scope: "global" as GovernanceDocument["scope"],
    accessPolicy: "publico" as GovernanceDocument["accessPolicy"],
    classification: "interno" as GovernanceDocument["classification"],
  });

  // Portfolio Modal State
  const [portfolioModalOpen, setPortfolioModalOpen] = useState(false);
  const [editingPortfolio, setEditingPortfolio] = useState<RepresentativePortfolio | null>(null);
  const [portfolioForm, setPortfolioForm] = useState({
    representativeId: "",
    criteriaType: "cliente" as PortfolioCriterion["type"],
    criteriaValue: "",
  });

  // Product Access Modal State
  const [productAccessModalOpen, setProductAccessModalOpen] = useState(false);
  const [editingProductAccess, setEditingProductAccess] = useState<RepresentativeProductAccess | null>(null);
  const [productAccessForm, setProductAccessForm] = useState({
    representativeId: "",
    produtoId: "",
    liberado: true,
    precoTabela: "",
    descontoMaximo: "",
    margemMinima: "",
  });

  // Calculation Simulator State
  const [calcForm, setCalcForm] = useState({
    policyId: "",
    representativeId: "",
    valorBase: 50000,
    margem: 18,
    desconto: 5,
    metaAtingimento: 105,
    regiao: "Sudeste",
    segmento: "Industrial",
    clienteId: "CLI-1029",
    pedidoId: "PED-2026-881",
  });
  const [calcResult, setCalcResult] = useState<CommissionCalculation | null>(null);

  // Load all governance data
  const loadData = useCallback(async () => {
    try {
      const [repsData, policiesData, rulesData, docsData, goalsData, campsData, calcsData, portfoliosData, productAccessData] =
        await Promise.all([
          governanceService.getRepresentatives(DEFAULT_ORG),
          governanceService.getPolicies(DEFAULT_ORG),
          governanceService.getRules(DEFAULT_ORG),
          governanceService.getDocuments(DEFAULT_ORG),
          governanceService.getGoals(DEFAULT_ORG),
          governanceService.getCampaigns(DEFAULT_ORG),
          governanceService.getCalculations(DEFAULT_ORG),
          governanceService.getPortfolios(DEFAULT_ORG),
          governanceService.getProductAccess(DEFAULT_ORG),
        ]);

      setReps(repsData);
      setPolicies(policiesData);
      setRules(rulesData);
      setDocuments(docsData);
      setGoals(goalsData);
      setCampaigns(campsData);
      setCalculations(calcsData);
      setPortfolios(portfoliosData);
      setProductAccess(productAccessData);

      // Default policy for calculation simulator
      if (policiesData.length > 0 && !calcForm.policyId) {
        setCalcForm((prev) => ({
          ...prev,
          policyId: policiesData[0].id,
          representativeId: repsData[0]?.id || "rep-1",
        }));
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      toast.error("Erro ao carregar governança comercial: " + message);
    }
  }, [calcForm.policyId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ─── KPI Calculations ──────────────────────────────────────────
  const kpis = useMemo(() => {
    const activeReps = reps.filter((r) => r.ativo).length;
    const activeRules = rules.filter((r) => r.status === "ativa" || r.status === "publicada").length;
    const activePolicies = policies.filter((p) => p.status === "publicada" || p.status === "ativa").length;
    const totalGoalsObjective = goals.reduce((acc, g) => acc + g.objetivo, 0);
    const totalGoalsAchieved = goals.reduce((acc, g) => acc + g.atingido, 0);
    const overallProgress = totalGoalsObjective > 0 ? (totalGoalsAchieved / totalGoalsObjective) * 100 : 0;

    return {
      activeReps,
      totalReps: reps.length,
      activeRules,
      totalRules: rules.length,
      activePolicies,
      totalCalculations: calculations.length,
      overallProgress: Math.min(100, overallProgress),
    };
  }, [reps, rules, policies, goals, calculations]);

  // ─── Representatives Handlers ──────────────────────────────────
  const handleOpenRepModal = (rep?: RepresentativeEnvironment) => {
    if (rep) {
      setEditingRep(rep);
      setRepForm({
        nome: rep.nome || "",
        codigo: rep.codigo || "",
        email: rep.email || "",
        telefone: rep.telefone || "",
        regiao: rep.regiao || "Sudeste",
        segmentos: rep.segmentos ? rep.segmentos.join(", ") : "",
        metaMensal: rep.metaMensal || 100000,
        comissao: rep.comissao || 5,
        ativo: rep.ativo,
      });
    } else {
      setEditingRep(null);
      setRepForm({
        nome: "",
        codigo: `REP00${reps.length + 1}`,
        email: "",
        telefone: "",
        regiao: "Sudeste",
        segmentos: "Industrial, Automotivo",
        metaMensal: 100000,
        comissao: 5,
        ativo: true,
      });
    }
    setRepModalOpen(true);
  };

  const handleSaveRep = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repForm.nome || !repForm.codigo) {
      toast.error("Preencha nome e código do representante");
      return;
    }

    try {
      const repData: RepresentativeEnvironment = {
        id: editingRep?.id || `rep-${Date.now()}`,
        organizationId: DEFAULT_ORG,
        representativeId: editingRep?.representativeId || `u-${Date.now()}`,
        nome: repForm.nome,
        codigo: repForm.codigo,
        email: repForm.email,
        telefone: repForm.telefone,
        regiao: repForm.regiao,
        segmentos: repForm.segmentos.split(",").map((s) => s.trim()).filter(Boolean),
        metaMensal: Number(repForm.metaMensal),
        comissao: Number(repForm.comissao),
        ativo: repForm.ativo,
        createdAt: editingRep?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await governanceService.saveRepresentative(repData, DEFAULT_ORG);
      toast.success(editingRep ? "Representante atualizado com sucesso" : "Representante cadastrado com sucesso");
      setRepModalOpen(false);
      loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      toast.error("Erro ao salvar representante: " + message);
    }
  };

  const handleToggleRepStatus = async (rep: RepresentativeEnvironment) => {
    try {
      const updated = { ...rep, ativo: !rep.ativo, updatedAt: new Date().toISOString() };
      await governanceService.saveRepresentative(updated, DEFAULT_ORG);
      toast.success(`Representante ${updated.ativo ? "ativado" : "desativado"}`);
      loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      toast.error("Erro ao alterar status: " + message);
    }
  };

  // ─── Portfolio (Carteira) Handlers ────────────────────────────────
  const handleOpenPortfolioModal = (portfolio?: RepresentativePortfolio) => {
    if (portfolio) {
      setEditingPortfolio(portfolio);
      setPortfolioForm({
        representativeId: portfolio.representativeId,
        criteriaType: portfolio.criteria[0]?.type || "cliente",
        criteriaValue: portfolio.criteria[0]?.type === "cliente" ? portfolio.criteria[0].clienteId :
                       portfolio.criteria[0]?.type === "regiao" ? portfolio.criteria[0].regiao :
                       portfolio.criteria[0]?.type === "segmento" ? portfolio.criteria[0].segmento :
                       portfolio.criteria[0]?.produtoId || "",
      });
    } else {
      setEditingPortfolio(null);
      setPortfolioForm({
        representativeId: reps[0]?.id || "",
        criteriaType: "cliente",
        criteriaValue: "",
      });
    }
    setPortfolioModalOpen(true);
  };

  const handleSavePortfolio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!portfolioForm.representativeId || !portfolioForm.criteriaValue) {
      toast.error("Preencha o representante e o critério");
      return;
    }

    try {
      let criteria: PortfolioCriterion;
      switch (portfolioForm.criteriaType) {
        case "cliente":
          criteria = { type: "cliente", clienteId: portfolioForm.criteriaValue };
          break;
        case "regiao":
          criteria = { type: "regiao", regiao: portfolioForm.criteriaValue };
          break;
        case "segmento":
          criteria = { type: "segmento", segmento: portfolioForm.criteriaValue };
          break;
        case "produto":
          criteria = { type: "produto", produtoId: portfolioForm.criteriaValue };
          break;
      }

      const portfolioData: RepresentativePortfolio = {
        id: editingPortfolio?.id || `pf-${Date.now()}`,
        organizationId: DEFAULT_ORG,
        representativeId: portfolioForm.representativeId,
        criteria: editingPortfolio ? [...editingPortfolio.criteria, criteria] : [criteria],
        createdAt: editingPortfolio?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await governanceService.savePortfolio(portfolioData, DEFAULT_ORG);
      toast.success(editingPortfolio ? "Carteira atualizada com sucesso" : "Critério adicionado à carteira");
      setPortfolioModalOpen(false);
      loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      toast.error("Erro ao salvar carteira: " + message);
    }
  };

  // ─── Product Access Handlers ─────────────────────────────────────
  const handleOpenProductAccessModal = (access?: RepresentativeProductAccess) => {
    if (access) {
      setEditingProductAccess(access);
      setProductAccessForm({
        representativeId: access.representativeId,
        produtoId: access.produtoId,
        liberado: access.liberado,
        precoTabela: String(access.precoTabela ?? ""),
        descontoMaximo: String(access.descontoMaximo ?? ""),
        margemMinima: String(access.margemMinima ?? ""),
      });
    } else {
      setEditingProductAccess(null);
      setProductAccessForm({
        representativeId: reps[0]?.id || "",
        produtoId: "",
        liberado: true,
        precoTabela: "",
        descontoMaximo: "",
        margemMinima: "",
      });
    }
    setProductAccessModalOpen(true);
  };

  const handleSaveProductAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productAccessForm.representativeId || !productAccessForm.produtoId) {
      toast.error("Selecione o representante e o produto");
      return;
    }

    try {
      const accessData: RepresentativeProductAccess = {
        id: editingProductAccess?.id || `pa-${Date.now()}`,
        organizationId: DEFAULT_ORG,
        representativeId: productAccessForm.representativeId,
        produtoId: productAccessForm.produtoId,
        liberado: productAccessForm.liberado,
        precoTabela: productAccessForm.precoTabela ? Number(productAccessForm.precoTabela) : undefined,
        descontoMaximo: productAccessForm.descontoMaximo ? Number(productAccessForm.descontoMaximo) : undefined,
        margemMinima: productAccessForm.margemMinima ? Number(productAccessForm.margemMinima) : undefined,
        createdAt: editingProductAccess?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await governanceService.saveProductAccess(accessData, DEFAULT_ORG);
      toast.success(editingProductAccess ? "Acesso a produto atualizado" : "Produto liberado para representante");
      setProductAccessModalOpen(false);
      loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      toast.error("Erro ao salvar acesso a produto: " + message);
    }
  };

  // ─── Commercial Rules Handlers ─────────────────────────────────
  const handleOpenRuleModal = (rule?: CommercialRule) => {
    if (rule) {
      setEditingRule(rule);
      const cond = rule.expression.conditions[0] || { field: "margem", operator: "gte", value: 15 };
      const act = rule.actions[0] || { type: "bonus", percentual: 1.5 };
      let actVal = 0;
      if ("percentual" in act && typeof act.percentual === "number") {
        actVal = act.percentual;
      }
      setRuleForm({
        name: rule.name,
        description: rule.description || "",
        field: cond.field,
        operator: cond.operator,
        value: String(cond.value),
        actionType: act.type,
        actionValue: actVal,
        priority: rule.priority,
        status: rule.status,
      });
    } else {
      setEditingRule(null);
      setRuleForm({
        name: "",
        description: "",
        field: "margem",
        operator: "gte",
        value: "15",
        actionType: "bonus",
        actionValue: 1.5,
        priority: 10,
        status: "ativa",
      });
    }
    setRuleModalOpen(true);
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleForm.name) {
      toast.error("Informe o nome da regra de governança");
      return;
    }

    try {
      const actionObj: RuleAction =
        ruleForm.actionType === "bonus"
          ? { type: "bonus", percentual: Number(ruleForm.actionValue) }
          : ruleForm.actionType === "comissao"
          ? { type: "comissao", percentual: Number(ruleForm.actionValue) }
          : ruleForm.actionType === "definir_desconto_maximo"
          ? { type: "definir_desconto_maximo", percentual: Number(ruleForm.actionValue) }
          : ruleForm.actionType === "definir_margem_minima"
          ? { type: "definir_margem_minima", percentual: Number(ruleForm.actionValue) }
          : ruleForm.actionType === "exigir_aprovacao"
          ? { type: "exigir_aprovacao" }
          : { type: "bloquear" };

      const ruleData: CommercialRule = {
        id: editingRule?.id || `rule-${Date.now()}`,
        organizationId: DEFAULT_ORG,
        name: ruleForm.name,
        description: ruleForm.description,
        expression: {
          combinator: "and",
          conditions: [
            {
              field: ruleForm.field,
              operator: ruleForm.operator,
              value: isNaN(Number(ruleForm.value)) ? ruleForm.value : Number(ruleForm.value),
            },
          ],
        },
        actions: [actionObj],
        priority: Number(ruleForm.priority),
        status: ruleForm.status,
        version: editingRule ? editingRule.version : 1,
        createdAt: editingRule?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await governanceService.saveRule(ruleData, DEFAULT_ORG);
      toast.success(editingRule ? "Regra comercial atualizada" : "Nova regra comercial cadastrada");
      setRuleModalOpen(false);
      loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      toast.error("Erro ao salvar regra: " + message);
    }
  };

  const handleCreateNewRuleVersion = async (rule: CommercialRule) => {
    try {
      await governanceService.createRuleVersion(rule.id, { description: `${rule.description || ""} (v${rule.version + 1})` }, DEFAULT_ORG);
      toast.success(`Nova versão v${rule.version + 1} criada em rascunho`);
      loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      toast.error("Erro ao criar versão: " + message);
    }
  };

  // ─── Commission Policies Handlers ──────────────────────────────
  const handleOpenPolicyModal = (policy?: CommissionPolicy) => {
    if (policy) {
      setEditingPolicy(policy);
      setPolicyForm({
        name: policy.name,
        comissaoBase: policy.comissaoBase,
        releasePolicy: policy.releasePolicy,
        ruleIds: policy.ruleIds,
        status: policy.status,
      });
    } else {
      setEditingPolicy(null);
      setPolicyForm({
        name: "",
        comissaoBase: 5,
        releasePolicy: "faturamento",
        ruleIds: rules.slice(0, 2).map((r) => r.id),
        status: "publicada",
      });
    }
    setPolicyModalOpen(true);
  };

  const handleSavePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!policyForm.name) {
      toast.error("Informe o nome da política de comissão");
      return;
    }

    try {
      const polData: CommissionPolicy = {
        id: editingPolicy?.id || `pol-${Date.now()}`,
        organizationId: DEFAULT_ORG,
        name: policyForm.name,
        comissaoBase: Number(policyForm.comissaoBase),
        releasePolicy: policyForm.releasePolicy,
        ruleIds: policyForm.ruleIds,
        version: editingPolicy ? editingPolicy.version : 1,
        status: policyForm.status,
        createdAt: editingPolicy?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await governanceService.savePolicy(polData, DEFAULT_ORG);
      toast.success(editingPolicy ? "Política comercial atualizada" : "Nova política de comissionamento salva");
      setPolicyModalOpen(false);
      loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      toast.error("Erro ao salvar política: " + message);
    }
  };

  // ─── Goals Handlers ────────────────────────────────────────────
  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const goalData: Goal = {
        id: `goal-${Date.now()}`,
        organizationId: DEFAULT_ORG,
        representativeId: goalForm.representativeId === "global" ? undefined : goalForm.representativeId,
        tipo: goalForm.tipo,
        objetivo: Number(goalForm.objetivo),
        atingido: Number(goalForm.atingido),
        periodoInicio: goalForm.periodoInicio,
        periodoFim: goalForm.periodoFim,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await governanceService.saveGoal(goalData, DEFAULT_ORG);
      toast.success("Meta comercial registrada com sucesso");
      setGoalModalOpen(false);
      loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      toast.error("Erro ao salvar meta: " + message);
    }
  };

  // ─── Documents Handlers ────────────────────────────────────────
  const handleSaveDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docForm.title) {
      toast.error("Informe o título do documento");
      return;
    }

    try {
      const docData: GovernanceDocument = {
        id: `doc-${Date.now()}`,
        organizationId: DEFAULT_ORG,
        ownerId: "u1",
        title: docForm.title.endsWith(".pdf") ? docForm.title : `${docForm.title}.pdf`,
        scope: docForm.scope,
        accessPolicy: docForm.accessPolicy,
        classification: docForm.classification,
        version: 1,
        status: "publicado",
        mimeType: "application/pdf",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        publishedAt: new Date().toISOString(),
      };

      await governanceService.saveDocument(docData, DEFAULT_ORG);
      toast.success("Documento de governança arquivado e publicado");
      setDocModalOpen(false);
      loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      toast.error("Erro ao salvar documento: " + message);
    }
  };

  // ─── Commission Simulator Execution ────────────────────────────
  const handleRunCalculation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!calcForm.policyId) {
      toast.error("Selecione uma política de comissão para a simulação");
      return;
    }

    try {
      const result = await governanceService.calculateCommission(
        {
          policyId: calcForm.policyId,
          representativeId: calcForm.representativeId || "rep-1",
          input: {
            valorBase: Number(calcForm.valorBase),
            margem: Number(calcForm.margem),
            desconto: Number(calcForm.desconto),
            metaAtingimento: Number(calcForm.metaAtingimento),
            regiao: calcForm.regiao,
            segmento: calcForm.segmento,
            clienteId: calcForm.clienteId,
          },
          metadata: {
            pedidoId: calcForm.pedidoId,
            clienteId: calcForm.clienteId,
          },
        },
        DEFAULT_ORG
      );

      setCalcResult(result);
      toast.success("Cálculo determinístico executado com sucesso");
      loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      toast.error("Erro no cálculo: " + message);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Commercial Governance & Rules Studio"
        subtitle="Gestão corporativa de regras comerciais, comissões determinísticas e ambientes isolados por representante"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setActiveTab("calculator");
              }}
              className="gap-2"
            >
              <Calculator className="h-4 w-4 text-emerald-600" />
              Simulador de Comissões
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                if (activeTab === "representatives") handleOpenRepModal();
                else if (activeTab === "rules") handleOpenRuleModal();
                else if (activeTab === "policies") handleOpenPolicyModal();
                else if (activeTab === "goals") setGoalModalOpen(true);
                else if (activeTab === "documents") setDocModalOpen(true);
                else handleOpenRuleModal();
              }}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              {activeTab === "representatives"
                ? "Novo Representante"
                : activeTab === "policies"
                ? "Nova Política"
                : activeTab === "goals"
                ? "Nova Meta"
                : activeTab === "documents"
                ? "Novo Documento"
                : "Nova Regra"}
            </Button>
          </div>
        }
      />

      {/* Primary Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full space-y-6">
        <TabsList className="flex w-full h-auto p-1 bg-muted/60 justify-start overflow-x-auto scrollbar-hide flex-nowrap">
          <TabsTrigger value="overview" className="gap-2 text-xs md:text-sm py-2 shrink-0">
            <Scale className="h-4 w-4" /> Visão Geral
          </TabsTrigger>
          <TabsTrigger value="representatives" className="gap-2 text-xs md:text-sm py-2 shrink-0">
            <Users className="h-4 w-4" /> Representantes
          </TabsTrigger>
          <TabsTrigger value="portfolios" className="gap-2 text-xs md:text-sm py-2 shrink-0">
            <Building2 className="h-4 w-4" /> Carteiras
          </TabsTrigger>
          <TabsTrigger value="product-access" className="gap-2 text-xs md:text-sm py-2 shrink-0">
            <ShieldCheck className="h-4 w-4" /> Produtos Permitidos
          </TabsTrigger>
          <TabsTrigger value="rules" className="gap-2 text-xs md:text-sm py-2 shrink-0">
            <ShieldCheck className="h-4 w-4" /> Regras Comerciais
          </TabsTrigger>
          <TabsTrigger value="policies" className="gap-2 text-xs md:text-sm py-2 shrink-0">
            <Tag className="h-4 w-4" /> Políticas
          </TabsTrigger>
          <TabsTrigger value="calculator" className="gap-2 text-xs md:text-sm py-2 shrink-0">
            <Calculator className="h-4 w-4" /> Auditoria & Cálculo
          </TabsTrigger>
          <TabsTrigger value="goals" className="gap-2 text-xs md:text-sm py-2 shrink-0">
            <Target className="h-4 w-4" /> Metas & Campanhas
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-2 text-xs md:text-sm py-2 shrink-0">
            <FileText className="h-4 w-4" /> Documentos & Acesso
          </TabsTrigger>
          <TabsTrigger value="lead-routing" className="gap-2 text-xs md:text-sm py-2 shrink-0">
            <Zap className="h-4 w-4" /> Qualificação & Roteamento v2.4
          </TabsTrigger>
          <TabsTrigger value="flows" className="gap-2 text-xs md:text-sm py-2 shrink-0">
            <GitFork className="h-4 w-4" /> Fluxos (Estúdio)
          </TabsTrigger>
        </TabsList>

        {/* ─── TAB: OVERVIEW ─────────────────────────────────────────── */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-border/60 shadow-xs">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Representantes Ativos</p>
                  <h3 className="text-2xl font-bold mt-1 text-foreground">
                    {kpis.activeReps} <span className="text-sm font-normal text-muted-foreground">/ {kpis.totalReps}</span>
                  </h3>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Ambientes com RLS isolado
                  </p>
                </div>
                <div className="p-3 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl">
                  <Users className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 shadow-xs">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Regras de Governança</p>
                  <h3 className="text-2xl font-bold mt-1 text-foreground">{kpis.activeRules}</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {kpis.totalRules} regras versionadas (v1-v3)
                  </p>
                </div>
                <div className="p-3 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl">
                  <ShieldCheck className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 shadow-xs">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Políticas Publicadas</p>
                  <h3 className="text-2xl font-bold mt-1 text-foreground">{kpis.activePolicies}</h3>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
                    <Check className="h-3 w-3" /> Motor determinístico ativo
                  </p>
                </div>
                <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
                  <Tag className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 shadow-xs">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Atingimento de Metas</p>
                  <h3 className="text-2xl font-bold mt-1 text-foreground">{kpis.overallProgress.toFixed(1)}%</h3>
                  <Progress value={kpis.overallProgress} className="h-1.5 mt-2 w-28" />
                </div>
                <div className="p-3 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl">
                  <Target className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Quick Actions & Policy Summary */}
            <Card className="lg:col-span-2 border-border/60">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold">Políticas & Regras em Vigor</CardTitle>
                    <CardDescription>Critérios determinísticos aplicados no fechamento e comissionamento</CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setActiveTab("rules")} className="text-xs gap-1">
                    Ver todas as regras <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {rules.slice(0, 3).map((r) => {
                    const cond = r.expression.conditions[0];
                    return (
                      <div
                        key={r.id}
                        className="p-3.5 rounded-lg border border-border/60 bg-card hover:bg-muted/30 transition-colors flex items-start justify-between gap-4"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-foreground">{r.name}</span>
                            <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                              v{r.version}
                            </Badge>
                            <Badge
                              variant="secondary"
                              className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300/30"
                            >
                              Prioridade {r.priority}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{r.description}</p>
                        </div>
                        <Badge variant="outline" className="text-xs font-mono shrink-0">
                          {cond?.field} {cond?.operator} {String(cond?.value)}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Isolation & Security Card */}
            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Lock className="h-4 w-4 text-primary" /> Isolamento & RLS Multi-Tenant
                </CardTitle>
                <CardDescription>Garantia de segregação de carteira e dados</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="p-3 bg-muted/50 rounded-lg space-y-1.5 border border-border/40">
                  <div className="font-medium text-foreground flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-blue-500" /> Organização Atual
                  </div>
                  <p className="text-muted-foreground font-mono text-[11px]">ID: {DEFAULT_ORG} (Vendas Protheus Enterprise)</p>
                </div>

                <div className="p-3 bg-muted/50 rounded-lg space-y-1.5 border border-border/40">
                  <div className="font-medium text-foreground flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> Nível de Visibilidade Padrão
                  </div>
                  <p className="text-muted-foreground">Representantes possuem escopo <span className="font-semibold text-foreground">"minha_carteira"</span> com bloqueio estrito de concorrência.</p>
                </div>

                <div className="p-3 bg-muted/50 rounded-lg space-y-1.5 border border-border/40">
                  <div className="font-medium text-foreground flex items-center gap-1.5">
                    <History className="h-3.5 w-3.5 text-indigo-500" /> Trilha de Auditoria
                  </div>
                  <p className="text-muted-foreground">Todos os cálculos determinísticos salvam snapshot imutável das regras aplicadas.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── TAB: REPRESENTATIVES ─────────────────────────────────── */}
        <TabsContent value="representatives" className="space-y-4">
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-semibold">Ambientes de Representantes</CardTitle>
                  <CardDescription>Representantes cadastrados, alçadas comerciais e regiões de atuação</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar representante..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8 h-9 text-xs"
                    />
                  </div>
                  <Button size="sm" onClick={() => handleOpenRepModal()} className="gap-1.5">
                    <Plus className="h-4 w-4" /> Novo Representante
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border border-border/60 overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Representante</TableHead>
                      <TableHead>Código</TableHead>
                      <TableHead>Região</TableHead>
                      <TableHead>Segmentos</TableHead>
                      <TableHead>Meta Mensal</TableHead>
                      <TableHead>Comissão Base</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reps
                      .filter(
                        (r) =>
                          !searchTerm ||
                          r.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          r.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          r.regiao.toLowerCase().includes(searchTerm.toLowerCase())
                      )
                      .map((rep) => (
                        <TableRow key={rep.id}>
                          <TableCell>
                            <div>
                              <div className="font-semibold text-foreground text-sm">{rep.nome}</div>
                              <div className="text-xs text-muted-foreground">{rep.email}</div>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-xs font-medium">{rep.codigo}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs font-normal">
                              {rep.regiao}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {rep.segmentos?.map((seg) => (
                                <Badge key={seg} variant="secondary" className="text-[10px]">
                                  {seg}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="font-medium text-xs">
                            {rep.metaMensal?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                          </TableCell>
                          <TableCell className="font-medium text-xs">{rep.comissao}%</TableCell>
                          <TableCell>
                            <Badge
                              variant={rep.ativo ? "default" : "secondary"}
                              className={
                                rep.ativo
                                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300/40"
                                  : "bg-muted text-muted-foreground"
                              }
                            >
                              {rep.ativo ? "Ativo" : "Inativo"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenRepModal(rep)}
                                className="h-8 w-8 p-0"
                                title="Editar"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleToggleRepStatus(rep)}
                                className="h-8 w-8 p-0"
                                title={rep.ativo ? "Desativar" : "Ativar"}
                              >
                                {rep.ativo ? <Lock className="h-3.5 w-3.5 text-amber-600" /> : <Check className="h-3.5 w-3.5 text-emerald-600" />}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── TAB: PORTFOLIOS (CARTEIRAS) ──────────────────────────────── */}
        <TabsContent value="portfolios" className="space-y-4">
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-semibold">Carteiras Comerciais Híbridas</CardTitle>
                  <CardDescription>Critérios flexíveis de carteira: clientes, regiões, segmentos e produtos por representante</CardDescription>
                </div>
                <Button size="sm" onClick={() => setPortfolioModalOpen(true)} className="gap-1.5">
                  <Plus className="h-4 w-4" /> Nova Carteira
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {portfolios.map((pf) => {
                  const repName = reps.find((r) => r.id === pf.representativeId)?.nome || "Representante";
                  return (
                    <div key={pf.id} className="p-4 rounded-lg border border-border/60 bg-card space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg">
                            <Building2 className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="font-semibold text-sm text-foreground">{repName}</div>
                            <div className="text-xs text-muted-foreground">Carteira flexível híbrida</div>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs font-medium shrink-0">
                          {pf.criteria?.length || 0} critérios
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {pf.criteria?.map((c, idx) => (
                          <Badge key={idx} variant="secondary" className="text-[10px]">
                            {c.type === "cliente" && `Cliente: ${c.clienteId}`}
                            {c.type === "regiao" && `Região: ${c.regiao}`}
                            {c.type === "segmento" && `Segmento: ${c.segmento}`}
                            {c.type === "produto" && `Produto: ${c.produtoId}`}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── TAB: PRODUCT ACCESS ─────────────────────────────────────── */}
        <TabsContent value="product-access" className="space-y-4">
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-semibold">Produtos Liberados por Representante</CardTitle>
                  <CardDescription>Controle granular de liberação, preço de tabela, desconto máximo e margem mínima</CardDescription>
                </div>
                <Button size="sm" onClick={() => setProductAccessModalOpen(true)} className="gap-1.5">
                  <Plus className="h-4 w-4" /> Liberar Produto
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border border-border/60 overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Representante</TableHead>
                      <TableHead>Produto</TableHead>
                      <TableHead>Liberado</TableHead>
                      <TableHead>Preço Tabela</TableHead>
                      <TableHead>Desconto Máx (%)</TableHead>
                      <TableHead>Margem Mín (%)</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productAccess.map((pa) => {
                      const repName = reps.find((r) => r.id === pa.representativeId)?.nome || "Rep";
                      return (
                        <TableRow key={pa.id}>
                          <TableCell>
                            <div className="font-semibold text-sm text-foreground">{repName}</div>
                          </TableCell>
                          <TableCell className="font-mono text-xs">{pa.produtoId}</TableCell>
                          <TableCell>
                            <Badge variant={pa.liberado ? "default" : "secondary"} className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300/40 text-xs">
                              {pa.liberado ? "Sim" : "Não"}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs">{pa.precoTabela ? pa.precoTabela.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "Padrão"}</TableCell>
                          <TableCell className="text-xs">{pa.descontoMaximo ?? "—"}</TableCell>
                          <TableCell className="text-xs">{pa.margemMinima ?? "—"}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Editar">
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── TAB: COMMERCIAL RULES ─────────────────────────────────── */}
        <TabsContent value="rules" className="space-y-4">
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-semibold">Regras Comerciais & Alçadas</CardTitle>
                  <CardDescription>Estruturas de regras avaliadas deterministicamente pelo motor de governança</CardDescription>
                </div>
                <Button size="sm" onClick={() => handleOpenRuleModal()} className="gap-1.5">
                  <Plus className="h-4 w-4" /> Nova Regra Comercial
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border border-border/60 overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Regra</TableHead>
                      <TableHead>Condição de Ativação</TableHead>
                      <TableHead>Ação / Efeito</TableHead>
                      <TableHead>Consumido no Flow Studio</TableHead>
                      <TableHead>Prioridade</TableHead>
                      <TableHead>Versão</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rules.map((rule) => {
                      const cond = rule.expression.conditions[0];
                      const act = rule.actions[0];
                      const consumingFlows = getFlowsConsumingGovernanceRule(rule.id);
                      return (
                        <TableRow key={rule.id}>
                          <TableCell>
                            <div>
                              <div className="font-semibold text-foreground text-sm">{rule.name}</div>
                              <div className="text-xs text-muted-foreground max-w-sm">{rule.description}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-mono text-xs">
                              {cond ? `${cond.field} ${cond.operator} ${String(cond.value)}` : "Sempre"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className={
                                act?.type === "bonus"
                                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                                  : act?.type === "bloquear"
                                  ? "bg-rose-500/10 text-rose-700 dark:text-rose-400"
                                  : "bg-blue-500/10 text-blue-700 dark:text-blue-400"
                              }
                            >
                              {act?.type === "bonus" && "percentual" in act
                                ? `+${act.percentual}% Bônus`
                                : act?.type === "comissao" && "percentual" in act
                                ? `${act.percentual}% Fixa`
                                : act?.type === "bloquear"
                                ? "Bloqueio Automático"
                                : act?.type === "exigir_aprovacao"
                                ? "Alçada de Gestor"
                                : act?.type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              {consumingFlows.slice(0, 2).map((flow, fIdx) => (
                                <Link
                                  key={fIdx}
                                  to={`/flow-studio?flow=${flow.flowId}`}
                                  className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                                >
                                  <GitFork className="h-3 w-3" />
                                  <span>{flow.flowTitle}</span>
                                </Link>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-xs">{rule.priority}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[11px] font-mono">
                              v{rule.version}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={rule.status === "ativa" || rule.status === "publicada" ? "default" : "secondary"}
                              className={
                                rule.status === "ativa" || rule.status === "publicada"
                                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300/40"
                                  : "bg-muted text-muted-foreground"
                              }
                            >
                              {rule.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenRuleModal(rule)}
                                className="h-8 w-8 p-0"
                                title="Editar"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCreateNewRuleVersion(rule)}
                                className="h-8 w-8 p-0"
                                title="Criar Nova Versão (v+1)"
                              >
                                <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── TAB: COMMISSION POLICIES ──────────────────────────────── */}
        <TabsContent value="policies" className="space-y-4">
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-semibold">Políticas de Comissionamento</CardTitle>
                  <CardDescription>Políticas corporativas que agregam regras e determinam momento de liberação</CardDescription>
                </div>
                <Button size="sm" onClick={() => handleOpenPolicyModal()} className="gap-1.5">
                  <Plus className="h-4 w-4" /> Nova Política
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {policies.map((pol) => (
                  <Card key={pol.id} className="border-border/60 shadow-xs flex flex-col justify-between">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-sm font-semibold">{pol.name}</CardTitle>
                          <CardDescription className="text-xs">Versão v{pol.version}</CardDescription>
                        </div>
                        <Badge
                          variant="secondary"
                          className={
                            pol.status === "publicada"
                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300/40"
                              : "bg-muted text-muted-foreground"
                          }
                        >
                          {pol.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 text-xs pt-2">
                      <div className="flex justify-between py-1 border-b border-border/40">
                        <span className="text-muted-foreground">Comissão Base:</span>
                        <span className="font-semibold text-foreground">{pol.comissaoBase}%</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-border/40">
                        <span className="text-muted-foreground">Gatilho de Liberação:</span>
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {pol.releasePolicy}
                        </Badge>
                      </div>
                      <div className="py-1">
                        <span className="text-muted-foreground block mb-1">Regras Vinculadas ({pol.ruleIds.length}):</span>
                        <div className="flex flex-wrap gap-1">
                          {pol.ruleIds.map((rId) => {
                            const rName = rules.find((r) => r.id === rId)?.name || rId;
                            return (
                              <Badge key={rId} variant="secondary" className="text-[10px]">
                                {rName}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    </CardContent>
                    <div className="p-4 pt-0 flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleOpenPolicyModal(pol)} className="text-xs h-8">
                        <Edit2 className="h-3.5 w-3.5 mr-1" /> Editar
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── TAB: CALCULATOR & AUDIT ───────────────────────────────── */}
        <TabsContent value="calculator" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Input Form */}
            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Calculator className="h-4 w-4 text-emerald-600" /> Simulador Determinístico
                </CardTitle>
                <CardDescription>Execute e audite o cálculo oficial de comissão</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleRunCalculation} className="space-y-3.5 text-xs">
                  <div>
                    <Label className="text-xs">Política Comercial</Label>
                    <Select
                      value={calcForm.policyId}
                      onValueChange={(val) => setCalcForm({ ...calcForm, policyId: val })}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Selecione a política..." />
                      </SelectTrigger>
                      <SelectContent>
                        {policies.map((p) => (
                          <SelectItem key={p.id} value={p.id} className="text-xs">
                            {p.name} ({p.comissaoBase}% base)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs">Representante</Label>
                    <Select
                      value={calcForm.representativeId}
                      onValueChange={(val) => setCalcForm({ ...calcForm, representativeId: val })}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Selecione o representante..." />
                      </SelectTrigger>
                      <SelectContent>
                        {reps.map((r) => (
                          <SelectItem key={r.id} value={r.id} className="text-xs">
                            {r.nome} ({r.codigo} - {r.regiao})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Valor Base (R$)</Label>
                      <Input
                        type="number"
                        value={calcForm.valorBase}
                        onChange={(e) => setCalcForm({ ...calcForm, valorBase: Number(e.target.value) })}
                        className="h-9 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Margem (%)</Label>
                      <Input
                        type="number"
                        value={calcForm.margem}
                        onChange={(e) => setCalcForm({ ...calcForm, margem: Number(e.target.value) })}
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Desconto Concedido (%)</Label>
                      <Input
                        type="number"
                        value={calcForm.desconto}
                        onChange={(e) => setCalcForm({ ...calcForm, desconto: Number(e.target.value) })}
                        className="h-9 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Atingimento da Meta (%)</Label>
                      <Input
                        type="number"
                        value={calcForm.metaAtingimento}
                        onChange={(e) => setCalcForm({ ...calcForm, metaAtingimento: Number(e.target.value) })}
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full gap-2 mt-2">
                    <Sparkles className="h-4 w-4" /> Executar Cálculo Oficial
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Results Card */}
            <Card className="lg:col-span-2 border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <History className="h-4 w-4 text-primary" /> Trilha de Auditoria & Snapshot
                </CardTitle>
                <CardDescription>Detalhamento determinístico das regras avaliadas</CardDescription>
              </CardHeader>
              <CardContent>
                {calcResult ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-muted/40 rounded-xl border border-border/60">
                      <div>
                        <span className="text-xs text-muted-foreground">Valor Base</span>
                        <div className="text-base font-bold text-foreground">
                          {calcResult.valorBase.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </div>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">% Base + Bônus</span>
                        <div className="text-base font-bold text-foreground">
                          {calcResult.comissaoBasePercentual}% + {calcResult.bonusPercentual}%
                        </div>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">% Final</span>
                        <div className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                          {calcResult.comissaoFinalPercentual}%
                        </div>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">Comissão Total</span>
                        <div className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                          {calcResult.comissaoValor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </div>
                      </div>
                    </div>

                    {/* Trace Table */}
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Regras Avaliadas no Trace ({calcResult.trace?.length || 0})
                      </h4>
                      <div className="rounded-md border border-border/60 overflow-hidden">
                        <Table>
                          <TableHeader className="bg-muted/50">
                            <TableRow>
                              <TableHead className="text-xs">Regra</TableHead>
                              <TableHead className="text-xs">Expressão Avaliada</TableHead>
                              <TableHead className="text-xs">Valor Extraído</TableHead>
                              <TableHead className="text-xs text-right">Resultado</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {calcResult.trace?.map((t, idx) => (
                              <TableRow key={idx}>
                                <TableCell className="text-xs font-medium">{t.ruleName} (v{t.version})</TableCell>
                                <TableCell className="font-mono text-[11px]">{t.condition}</TableCell>
                                <TableCell className="text-xs font-mono">{String(t.evaluatedValue ?? "-")}</TableCell>
                                <TableCell className="text-right">
                                  {t.matched ? (
                                    <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300/40 text-[10px]">
                                      Match (Aplicada)
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-[10px] text-muted-foreground">
                                      Não aplicável
                                    </Badge>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
                    <Calculator className="h-10 w-10 text-muted-foreground/40 mb-3" />
                    <p className="font-medium text-sm">Nenhum cálculo simulado ainda</p>
                    <p className="text-xs text-muted-foreground max-w-sm mt-1">
                      Preencha os dados do pedido/oportunidade ao lado e clique em "Executar Cálculo Oficial" para ver o resultado auditável.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── TAB: GOALS & CAMPAIGNS ────────────────────────────────── */}
        <TabsContent value="goals" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Goals */}
            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold">Metas Comerciais Q3/Q4</CardTitle>
                    <CardDescription>Metas por representante e objetivos globais da organização</CardDescription>
                  </div>
                  <Button size="sm" onClick={() => setGoalModalOpen(true)} className="gap-1.5">
                    <Plus className="h-4 w-4" /> Nova Meta
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {goals.map((g) => {
                    const repName = g.representativeId ? reps.find((r) => r.id === g.representativeId)?.nome || "Representante" : "Meta Global (Organização)";
                    const progress = g.objetivo > 0 ? (g.atingido / g.objetivo) * 100 : 0;
                    return (
                      <div key={g.id} className="p-3.5 rounded-lg border border-border/60 bg-card space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-sm text-foreground">{repName}</span>
                          <span className="text-xs font-bold text-foreground">{progress.toFixed(1)}%</span>
                        </div>
                        <Progress value={Math.min(100, progress)} className="h-2" />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Atingido: {g.atingido.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                          <span>Objetivo: {g.objetivo.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Campaigns */}
            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Campanhas Comerciais Ativas</CardTitle>
                <CardDescription>Incentivos e regras de aceleração de canais e produtos</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {campaigns.map((camp) => (
                    <div key={camp.id} className="p-4 rounded-lg border border-border/60 bg-card space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm text-foreground">{camp.name}</span>
                        <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300/40 text-xs">
                          {camp.ativo ? "Em Andamento" : "Encerrada"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{camp.descricao}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
                        <span>Início: {camp.inicio}</span>
                        <span>Término: {camp.fim || "Indeterminado"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── TAB: DOCUMENTS & ACCESS ──────────────────────────────── */}
        <TabsContent value="documents" className="space-y-4">
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-semibold">Políticas & Documentos de Governança</CardTitle>
                  <CardDescription>Manuais, tabelas de preço, regulamentos de comissão e diretrizes conectados aos fluxos</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setIsFlowDocsModalOpen(true)}
                    className="gap-1.5 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 bg-emerald-50/60 dark:bg-emerald-950/40 hover:bg-emerald-100"
                  >
                    <Sparkles className="h-4 w-4 text-emerald-600" /> Matriz de Conexão com Fluxos
                  </Button>
                  <Button size="sm" onClick={() => setDocModalOpen(true)} className="gap-1.5">
                    <Plus className="h-4 w-4" /> Novo Documento
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border border-border/60 overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Título do Documento</TableHead>
                      <TableHead>Fluxos Vinculados (Auto)</TableHead>
                      <TableHead>Escopo de Acesso</TableHead>
                      <TableHead>Classificação</TableHead>
                      <TableHead>Versão</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documents.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-primary shrink-0" />
                            <div>
                              <span className="font-semibold text-sm text-foreground block">{doc.title}</span>
                              {doc.categoryLabel && (
                                <span className="text-[10px] text-muted-foreground">{doc.categoryLabel}</span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1 max-w-[240px]">
                            {doc.connectedFlowIds && doc.connectedFlowIds.length > 0 ? (
                              doc.connectedFlowIds.map(fId => (
                                <Badge key={fId} variant="outline" className="text-[10px] bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-300/60 dark:border-emerald-900/40 font-mono">
                                  {fId === "commission-engine" ? "Comissões" :
                                   fId === "discount-approval" ? "Aprovação Desconto" :
                                   fId === "high-ticket-deal" ? "High-Ticket" :
                                   fId === "sales-rep-flow" ? "Representantes" :
                                   fId === "protheus-sync-flow" ? "TOTVS Protheus" :
                                   fId === "credit-analysis" ? "Análise Crédito" :
                                   fId === "churn-prevention" ? "Anti-Churn" : fId}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-xs text-muted-foreground italic">Todas as Operações</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs capitalize font-normal">
                            {doc.scope}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={
                              doc.classification === "confidencial"
                                ? "bg-rose-500/10 text-rose-700 dark:text-rose-400"
                                : "bg-blue-500/10 text-blue-700 dark:text-blue-400"
                            }
                          >
                            {doc.classification}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">v{doc.version}</TableCell>
                        <TableCell>
                          <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300/40 text-xs">
                            {doc.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toast.success(`Visualizando: ${doc.title}`)}
                            className="h-8 text-xs gap-1"
                          >
                            <Eye className="h-3.5 w-3.5" /> Abrir
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="lead-routing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Qualificação & Roteamento de Leads v2.4</CardTitle>
              <CardDescription>Defina as regras automáticas de distribuição e qualificação.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-10 text-muted-foreground">
                Configurações de qualificação e roteamento serão exibidas aqui.
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="flows" className="space-y-6">
          <GovernanceFlowSyncPanel organizationId={DEFAULT_ORG} />
        </TabsContent>
      </Tabs>

      {/* ─── MODAL: REPRESENTATIVE ───────────────────────────────────── */}
      <Dialog open={repModalOpen} onOpenChange={setRepModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingRep ? "Editar Representante" : "Novo Representante"}</DialogTitle>
            <DialogDescription>
              Configure o ambiente isolado do parceiro comercial com segregação de dados e alçada.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveRep} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Nome Completo</Label>
                <Input
                  value={repForm.nome}
                  onChange={(e) => setRepForm({ ...repForm, nome: e.target.value })}
                  placeholder="Ex: João da Silva"
                  required
                />
              </div>
              <div>
                <Label className="text-xs">Código (ERP/Protheus)</Label>
                <Input
                  value={repForm.codigo}
                  onChange={(e) => setRepForm({ ...repForm, codigo: e.target.value })}
                  placeholder="Ex: REP001"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">E-mail</Label>
                <Input
                  type="email"
                  value={repForm.email}
                  onChange={(e) => setRepForm({ ...repForm, email: e.target.value })}
                  placeholder="rep@empresa.com"
                />
              </div>
              <div>
                <Label className="text-xs">Telefone</Label>
                <Input
                  value={repForm.telefone}
                  onChange={(e) => setRepForm({ ...repForm, telefone: e.target.value })}
                  placeholder="(11) 99999-9999"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Região Comercial</Label>
                <Select
                  value={repForm.regiao}
                  onValueChange={(val) => setRepForm({ ...repForm, regiao: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Sudeste">Sudeste</SelectItem>
                    <SelectItem value="Nordeste">Nordeste</SelectItem>
                    <SelectItem value="Sul">Sul</SelectItem>
                    <SelectItem value="Centro-Oeste">Centro-Oeste</SelectItem>
                    <SelectItem value="Norte">Norte</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Comissão Base (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={repForm.comissao}
                  onChange={(e) => setRepForm({ ...repForm, comissao: Number(e.target.value) })}
                />
              </div>
            </div>

            <div>
              <Label className="text-xs">Segmentos Autorizados (separados por vírgula)</Label>
              <Input
                value={repForm.segmentos}
                onChange={(e) => setRepForm({ ...repForm, segmentos: e.target.value })}
                placeholder="Industrial, Automotivo, Varejo"
              />
            </div>

            <div>
              <Label className="text-xs">Meta Mensal (R$)</Label>
              <Input
                type="number"
                value={repForm.metaMensal}
                onChange={(e) => setRepForm({ ...repForm, metaMensal: Number(e.target.value) })}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRepModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Salvar Representante</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL: COMMERCIAL RULE ─────────────────────────────────── */}
      <Dialog open={ruleModalOpen} onOpenChange={setRuleModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingRule ? "Editar Regra Comercial" : "Nova Regra Comercial"}</DialogTitle>
            <DialogDescription>
              Defina critérios de negócio e ações avaliadas no motor determinístico de governança.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveRule} className="space-y-4">
            <div>
              <Label className="text-xs">Nome da Regra</Label>
              <Input
                value={ruleForm.name}
                onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })}
                placeholder="Ex: Bônus por Margem Alta"
                required
              />
            </div>

            <div>
              <Label className="text-xs">Descrição Operacional</Label>
              <Textarea
                value={ruleForm.description}
                onChange={(e) => setRuleForm({ ...ruleForm, description: e.target.value })}
                placeholder="Ex: Concede 1.5% adicional para vendas com margem superior a 15%."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs">Campo</Label>
                <Select
                  value={ruleForm.field}
                  onValueChange={(val: ConditionField) => setRuleForm({ ...ruleForm, field: val })}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="margem">Margem (%)</SelectItem>
                    <SelectItem value="desconto">Desconto (%)</SelectItem>
                    <SelectItem value="valor">Valor Base</SelectItem>
                    <SelectItem value="regiao">Região</SelectItem>
                    <SelectItem value="segmento">Segmento</SelectItem>
                    <SelectItem value="meta_atingimento">Atingimento Meta</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Operador</Label>
                <Select
                  value={ruleForm.operator}
                  onValueChange={(val: ConditionOperator) => setRuleForm({ ...ruleForm, operator: val })}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gte">&gt;= (Maior/Igual)</SelectItem>
                    <SelectItem value="gt">&gt; (Maior que)</SelectItem>
                    <SelectItem value="lte">&lt;= (Menor/Igual)</SelectItem>
                    <SelectItem value="lt">&lt; (Menor que)</SelectItem>
                    <SelectItem value="eq">= (Igual a)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Valor Alvo</Label>
                <Input
                  value={ruleForm.value}
                  onChange={(e) => setRuleForm({ ...ruleForm, value: e.target.value })}
                  placeholder="Ex: 15 ou Nordeste"
                  className="text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Ação Disparada</Label>
                <Select
                  value={ruleForm.actionType}
                  onValueChange={(val: "bonus" | "comissao" | "exigir_aprovacao" | "bloquear" | "definir_desconto_maximo" | "definir_margem_minima") => setRuleForm({ ...ruleForm, actionType: val })}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bonus">Adicionar Bônus (%)</SelectItem>
                    <SelectItem value="comissao">Definir Comissão Fixa (%)</SelectItem>
                    <SelectItem value="exigir_aprovacao">Exigir Aprovação de Alçada</SelectItem>
                    <SelectItem value="bloquear">Bloquear Faturamento</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(ruleForm.actionType === "bonus" || ruleForm.actionType === "comissao") && (
                <div>
                  <Label className="text-xs">Valor da Ação (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={ruleForm.actionValue}
                    onChange={(e) => setRuleForm({ ...ruleForm, actionValue: Number(e.target.value) })}
                    className="text-xs"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Prioridade de Execução (1-100)</Label>
                <Input
                  type="number"
                  value={ruleForm.priority}
                  onChange={(e) => setRuleForm({ ...ruleForm, priority: Number(e.target.value) })}
                  className="text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">Status da Regra</Label>
                <Select
                  value={ruleForm.status}
                  onValueChange={(val: RuleStatus) => setRuleForm({ ...ruleForm, status: val })}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativa">Ativa</SelectItem>
                    <SelectItem value="publicada">Publicada</SelectItem>
                    <SelectItem value="rascunho">Rascunho</SelectItem>
                    <SelectItem value="arquivada">Arquivada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRuleModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Salvar Regra</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL: POLICY ──────────────────────────────────────────── */}
      <Dialog open={policyModalOpen} onOpenChange={setPolicyModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingPolicy ? "Editar Política" : "Nova Política de Comissionamento"}</DialogTitle>
            <DialogDescription>
              Defina a comissão base, momento de liberação financeira e regras aplicáveis.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSavePolicy} className="space-y-4">
            <div>
              <Label className="text-xs">Nome da Política</Label>
              <Input
                value={policyForm.name}
                onChange={(e) => setPolicyForm({ ...policyForm, name: e.target.value })}
                placeholder="Ex: Política Comercial Geral 2026"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Comissão Base (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={policyForm.comissaoBase}
                  onChange={(e) => setPolicyForm({ ...policyForm, comissaoBase: Number(e.target.value) })}
                  required
                />
              </div>

              <div>
                <Label className="text-xs">Gatilho de Liberação</Label>
                <Select
                  value={policyForm.releasePolicy}
                  onValueChange={(val: CommissionReleasePolicy) => setPolicyForm({ ...policyForm, releasePolicy: val })}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pedido">No Pedido Aprovado</SelectItem>
                    <SelectItem value="faturamento">No Faturamento (Nota Fiscal)</SelectItem>
                    <SelectItem value="recebimento">Na Liquidação Financeira</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-xs mb-1.5 block">Regras Comerciais Vinculadas</Label>
              <div className="border border-border/60 rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
                {rules.map((rule) => {
                  const checked = policyForm.ruleIds.includes(rule.id);
                  return (
                    <label key={rule.id} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-muted/40 p-1.5 rounded">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setPolicyForm({ ...policyForm, ruleIds: [...policyForm.ruleIds, rule.id] });
                          } else {
                            setPolicyForm({ ...policyForm, ruleIds: policyForm.ruleIds.filter((id) => id !== rule.id) });
                          }
                        }}
                        className="rounded border-border"
                      />
                      <span className="font-medium text-foreground">{rule.name}</span>
                      <span className="text-muted-foreground font-mono text-[10px]">(v{rule.version})</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPolicyModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Salvar Política</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL: GOAL ────────────────────────────────────────────── */}
      <Dialog open={goalModalOpen} onOpenChange={setGoalModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Meta Comercial</DialogTitle>
            <DialogDescription>Cadastre metas com monitoramento de progresso.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveGoal} className="space-y-4">
            <div>
              <Label className="text-xs">Atribuir a</Label>
              <Select
                value={goalForm.representativeId}
                onValueChange={(val) => setGoalForm({ ...goalForm, representativeId: val })}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">Meta Global (Toda Organização)</SelectItem>
                  {reps.map((r) => (
                    <SelectItem key={r.id} value={r.id} className="text-xs">
                      {r.nome} ({r.codigo})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Objetivo (R$)</Label>
                <Input
                  type="number"
                  value={goalForm.objetivo}
                  onChange={(e) => setGoalForm({ ...goalForm, objetivo: Number(e.target.value) })}
                  required
                />
              </div>
              <div>
                <Label className="text-xs">Atingido Inicial (R$)</Label>
                <Input
                  type="number"
                  value={goalForm.atingido}
                  onChange={(e) => setGoalForm({ ...goalForm, atingido: Number(e.target.value) })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setGoalModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Salvar Meta</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL: DOCUMENT ────────────────────────────────────────── */}
      <Dialog open={docModalOpen} onOpenChange={setDocModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Documento de Governança</DialogTitle>
            <DialogDescription>Cadastre manuais e diretrizes para os representantes.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveDoc} className="space-y-4">
            <div>
              <Label className="text-xs">Título do Documento</Label>
              <Input
                value={docForm.title}
                onChange={(e) => setDocForm({ ...docForm, title: e.target.value })}
                placeholder="Ex: Manual de Comissionamento 2026.pdf"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Escopo</Label>
                <Select
                  value={docForm.scope}
                  onValueChange={(val: GovernanceDocument["scope"]) => setDocForm({ ...docForm, scope: val })}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">Global</SelectItem>
                    <SelectItem value="organizacao">Organização</SelectItem>
                    <SelectItem value="representante">Representante</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Classificação</Label>
                <Select
                  value={docForm.classification}
                  onValueChange={(val: GovernanceDocument["classification"]) => setDocForm({ ...docForm, classification: val })}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="publico">Público</SelectItem>
                    <SelectItem value="interno">Interno</SelectItem>
                    <SelectItem value="confidencial">Confidencial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDocModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Publicar Documento</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Automated Normative Documents & Commercial Policies Modal */}
      {isFlowDocsModalOpen && (
        <React.Suspense fallback={null}>
          <FlowDocumentsModal
            isOpen={isFlowDocsModalOpen}
            onClose={() => setIsFlowDocsModalOpen(false)}
          />
        </React.Suspense>
      )}
    </div>
  );
}
