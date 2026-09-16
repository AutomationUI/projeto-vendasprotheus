import { Node, Edge } from 'reactflow';
import { CRMNodeData } from '../types/crm-flow';

export interface WorkflowValidationIssue {
  id: string;
  type: 'error' | 'warning' | 'info';
  category: 'cycle' | 'unreachable' | 'missing_config' | 'dangling_edge' | 'missing_trigger' | 'empty_workflow';
  nodeId?: string;
  nodeLabel?: string;
  edgeId?: string;
  cyclePath?: string[];
  title: string;
  message: string;
  suggestion?: string;
  canAutoFix?: boolean;
  autoFixAction?: 'remove_unreachable' | 'break_cycle' | 'fill_default' | 'clean_dangling';
}

export interface WorkflowValidationResult {
  isValid: boolean;
  hasErrors: boolean;
  errorsCount: number;
  warningsCount: number;
  issues: WorkflowValidationIssue[];
  validatedAt: string;
  errorNodeIds: string[];
  warningNodeIds: string[];
  errorEdgeIds: string[];
  cycleNodeIds: string[];
  unreachableNodeIds: string[];
  missingConfigNodeIds: string[];
}

export interface WorkflowValidationOptions {
  strictMode?: boolean; // When true, treat unreachable nodes and incomplete branches as errors
}

/**
 * Validates a workflow definition for circular dependencies, unreachable nodes,
 * and missing mandatory configurations before saving or exporting.
 */
export function validateWorkflow(
  nodes: Node<CRMNodeData>[],
  edges: Edge[],
  options: WorkflowValidationOptions = {}
): WorkflowValidationResult {
  const issues: WorkflowValidationIssue[] = [];
  const strict = options.strictMode ?? true;

  const nodeMap = new Map<string, Node<CRMNodeData>>();
  nodes.forEach((node) => nodeMap.set(node.id, node));

  // 0. Empty Workflow Check
  if (nodes.length === 0) {
    issues.push({
      id: 'err-empty-workflow',
      type: 'error',
      category: 'empty_workflow',
      title: 'Fluxo Vazio',
      message: 'O canvas não possui nenhum nó. O fluxo precisa conter ao menos um gatilho e uma ação.',
      suggestion: 'Arraste um nó do tipo "Gatilho" ou adicione um modelo para iniciar.'
    });

    return {
      isValid: false,
      hasErrors: true,
      errorsCount: 1,
      warningsCount: 0,
      issues,
      validatedAt: new Date().toLocaleTimeString('pt-BR'),
      errorNodeIds: [],
      warningNodeIds: [],
      errorEdgeIds: [],
      cycleNodeIds: [],
      unreachableNodeIds: [],
      missingConfigNodeIds: []
    };
  }

  // 1. Trigger Node Check (Entry Point)
  const triggerNodes = nodes.filter(
    (n) => n.type === 'triggerNode' || n.data?.type === 'trigger'
  );

  if (triggerNodes.length === 0) {
    issues.push({
      id: 'err-no-trigger',
      type: 'error',
      category: 'missing_trigger',
      title: 'Nenhum Gatilho Configurado',
      message: 'O fluxo não possui nenhum ponto de entrada (Gatilho). Sem um gatilho, a automação não pode ser iniciada.',
      suggestion: 'Adicione pelo menos um nó do tipo "Gatilho" para iniciar a execução do processo.'
    });
  }

  // 2. Dangling Edges Check (edges connecting non-existent nodes)
  const danglingEdgeIds = new Set<string>();
  edges.forEach((edge) => {
    const hasSource = nodeMap.has(edge.source);
    const hasTarget = nodeMap.has(edge.target);

    if (!hasSource) {
      danglingEdgeIds.add(edge.id);
      issues.push({
        id: `err-dangling-source-${edge.id}`,
        type: 'error',
        category: 'dangling_edge',
        edgeId: edge.id,
        title: 'Aresta Desconectada (Origem Inexistente)',
        message: `A conexão "${edge.id}" aponta para um nó de origem que não existe no canvas (${edge.source}).`,
        suggestion: 'Exclua esta conexão órfã ou reconecte-a a um nó válido.',
        canAutoFix: true,
        autoFixAction: 'clean_dangling'
      });
    }
    if (!hasTarget) {
      danglingEdgeIds.add(edge.id);
      issues.push({
        id: `err-dangling-target-${edge.id}`,
        type: 'error',
        category: 'dangling_edge',
        edgeId: edge.id,
        title: 'Aresta Desconectada (Destino Inexistente)',
        message: `A conexão "${edge.id}" aponta para um nó de destino que não existe no canvas (${edge.target}).`,
        suggestion: 'Exclua esta conexão órfã ou reconecte-a a um nó válido.',
        canAutoFix: true,
        autoFixAction: 'clean_dangling'
      });
    }
  });

  // Build Adjacency List & Graph Structure (only over valid edges)
  const adjList = new Map<string, string[]>();
  const edgeLookup = new Map<string, Edge>(); // "source->target" => Edge
  const inDegree = new Map<string, number>();
  const outDegree = new Map<string, number>();

  nodes.forEach((n) => {
    adjList.set(n.id, []);
    inDegree.set(n.id, 0);
    outDegree.set(n.id, 0);
  });

  edges.forEach((edge) => {
    if (nodeMap.has(edge.source) && nodeMap.has(edge.target)) {
      adjList.get(edge.source)?.push(edge.target);
      edgeLookup.set(`${edge.source}->${edge.target}`, edge);
      inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
      outDegree.set(edge.source, (outDegree.get(edge.source) || 0) + 1);
    }
  });

  // 3. Circular Dependency Detection (Self-loops + Multi-Node Cycles)
  const cycleNodeIdsSet = new Set<string>();
  const cycleEdgeIdsSet = new Set<string>();

  // 3.1 Self-Loop Detection (edge.source === edge.target)
  edges.forEach((edge) => {
    if (edge.source === edge.target && nodeMap.has(edge.source)) {
      cycleNodeIdsSet.add(edge.source);
      cycleEdgeIdsSet.add(edge.id);
      const label = nodeMap.get(edge.source)?.data?.label || edge.source;
      issues.push({
        id: `err-self-loop-${edge.id}`,
        type: 'error',
        category: 'cycle',
        nodeId: edge.source,
        nodeLabel: label,
        edgeId: edge.id,
        cyclePath: [edge.source, edge.source],
        title: 'Auto-Dependência Circular (Self-Loop)',
        message: `O nó "${label}" está conectado diretamente a si mesmo, gerando um loop infinito imediato.`,
        suggestion: 'Remova a conexão circular que reconecta a saída à própria entrada do nó.',
        canAutoFix: true,
        autoFixAction: 'break_cycle'
      });
    }
  });

  // 3.2 Multi-Node Cycle Detection (Tarjan / DFS with 3-Color States)
  // State: 0: UNVISITED, 1: VISITING (in recursion stack), 2: VISITED
  const visitedState = new Map<string, 0 | 1 | 2>();
  nodes.forEach((n) => visitedState.set(n.id, 0));

  const recordedCycles = new Set<string>(); // normalized path string to prevent duplicates

  function dfsDetectCycles(nodeId: string, currentPath: string[]) {
    visitedState.set(nodeId, 1);
    currentPath.push(nodeId);

    const neighbors = adjList.get(nodeId) || [];
    for (const neighbor of neighbors) {
      if (neighbor === nodeId) continue; // self-loops already handled

      const neighborState = visitedState.get(neighbor);
      if (neighborState === 1) {
        // Back-edge found! Cycle detected: neighbor -> ... -> nodeId -> neighbor
        const cycleStartIndex = currentPath.indexOf(neighbor);
        if (cycleStartIndex !== -1) {
          const rawCycle = currentPath.slice(cycleStartIndex);
          const fullCyclePath = [...rawCycle, neighbor];

          // Normalize cycle key (rotate so smallest node ID is first) to deduplicate
          const minId = rawCycle.reduce((min, cur) => (cur < min ? cur : min), rawCycle[0]);
          const minIdx = rawCycle.indexOf(minId);
          const normalizedPath = [...rawCycle.slice(minIdx), ...rawCycle.slice(0, minIdx)].join('->');

          if (!recordedCycles.has(normalizedPath)) {
            recordedCycles.add(normalizedPath);

            // Record cycle nodes & edges
            rawCycle.forEach((id) => cycleNodeIdsSet.add(id));
            const backEdge = edgeLookup.get(`${nodeId}->${neighbor}`);
            if (backEdge) cycleEdgeIdsSet.add(backEdge.id);

            const cycleLabels = fullCyclePath
              .map((id) => nodeMap.get(id)?.data?.label || id)
              .join(' → ');

            issues.push({
              id: `err-cycle-${normalizedPath}`,
              type: 'error',
              category: 'cycle',
              nodeId: neighbor,
              nodeLabel: nodeMap.get(neighbor)?.data?.label || neighbor,
              edgeId: backEdge?.id,
              cyclePath: fullCyclePath,
              title: 'Dependência Circular Detectada (Loop Infinito)',
              message: `Foi identificado um ciclo fechado no fluxo: ${cycleLabels}`,
              suggestion: 'Remova uma das conexões que fecha o circuito para tornar o fluxo acíclico e determinístico.',
              canAutoFix: true,
              autoFixAction: 'break_cycle'
            });
          }
        }
      } else if (neighborState === 0) {
        dfsDetectCycles(neighbor, currentPath);
      }
    }

    visitedState.set(nodeId, 2);
    currentPath.pop();
  }

  nodes.forEach((node) => {
    if (visitedState.get(node.id) === 0) {
      dfsDetectCycles(node.id, []);
    }
  });

  // 4. Reachability & Unreachable Nodes Check
  // All executable paths must stem from at least one Trigger node.
  const reachableFromTriggers = new Set<string>();
  const queue: string[] = triggerNodes.map((n) => n.id);
  queue.forEach((id) => reachableFromTriggers.add(id));

  while (queue.length > 0) {
    const curr = queue.shift()!;
    const neighbors = adjList.get(curr) || [];
    for (const nextId of neighbors) {
      if (!reachableFromTriggers.has(nextId)) {
        reachableFromTriggers.add(nextId);
        queue.push(nextId);
      }
    }
  }

  const unreachableNodeIdsSet = new Set<string>();

  nodes.forEach((node) => {
    // If it's a trigger node, it's inherently an entry point
    if (triggerNodes.some((t) => t.id === node.id)) return;

    if (!reachableFromTriggers.has(node.id)) {
      unreachableNodeIdsSet.add(node.id);
      const inDeg = inDegree.get(node.id) || 0;
      const outDeg = outDegree.get(node.id) || 0;
      const label = node.data?.label || node.id;

      if (inDeg === 0 && outDeg === 0) {
        issues.push({
          id: `err-isolated-node-${node.id}`,
          type: strict ? 'error' : 'warning',
          category: 'unreachable',
          nodeId: node.id,
          nodeLabel: label,
          title: 'Nó Totalmente Isolado',
          message: `O nó "${label}" está solto no canvas, sem conexões de entrada nem de saída.`,
          suggestion: 'Conecte este nó ao fluxo principal ou remova-o para manter o diagrama limpo.',
          canAutoFix: true,
          autoFixAction: 'remove_unreachable'
        });
      } else if (inDeg === 0) {
        issues.push({
          id: `err-unreachable-root-${node.id}`,
          type: strict ? 'error' : 'warning',
          category: 'unreachable',
          nodeId: node.id,
          nodeLabel: label,
          title: 'Nó Inalcançável (Sem Conexão de Entrada)',
          message: `O nó "${label}" não é um gatilho e não recebe conexão de nenhuma etapa anterior.`,
          suggestion: 'Ligue uma etapa anterior a este nó ou transforme-o em um gatilho se for uma entrada secundária.',
          canAutoFix: true,
          autoFixAction: 'remove_unreachable'
        });
      } else {
        issues.push({
          id: `err-island-subgraph-${node.id}`,
          type: strict ? 'error' : 'warning',
          category: 'unreachable',
          nodeId: node.id,
          nodeLabel: label,
          title: 'Sub-fluxo Desconexo (Ilha Isolada)',
          message: `O nó "${label}" pertence a um grupo isolado que não pode ser acionado por nenhum gatilho do fluxo.`,
          suggestion: 'Ligue o gatilho principal a este sub-fluxo para que ele seja executado.',
          canAutoFix: true,
          autoFixAction: 'remove_unreachable'
        });
      }
    }
  });

  // 5. Mandatory Configuration Verification per Node Type
  const missingConfigNodeIdsSet = new Set<string>();

  nodes.forEach((node) => {
    const label = node.data?.label?.trim();
    const config = node.data?.config || {};
    const type = node.data?.type || node.type?.replace('Node', '');
    const outEdges = edges.filter((e) => e.source === node.id && nodeMap.has(e.target));

    // 5.1 General Node Check: Label / Name
    if (!label || label === '' || label.toLowerCase() === 'novo nó' || label.toLowerCase() === 'untitled') {
      missingConfigNodeIdsSet.add(node.id);
      issues.push({
        id: `err-missing-label-${node.id}`,
        type: 'error',
        category: 'missing_config',
        nodeId: node.id,
        nodeLabel: node.id,
        title: 'Nome do Nó Obrigatório Ausente',
        message: `O nó (${node.id}) está sem título descritivo.`,
        suggestion: 'Defina um nome claro para identificar esta etapa nas trilhas de auditoria.',
        canAutoFix: true,
        autoFixAction: 'fill_default'
      });
    }

    // 5.2 Trigger Node Mandatory Config
    if (type === 'trigger') {
      const hasTriggerSource = config.source || config.protheusTriggerEvent || config.sourceEvent;
      if (!hasTriggerSource) {
        missingConfigNodeIdsSet.add(node.id);
        issues.push({
          id: `err-trigger-source-${node.id}`,
          type: 'error',
          category: 'missing_config',
          nodeId: node.id,
          nodeLabel: label || node.id,
          title: 'Origem do Gatilho Não Configurada',
          message: `O gatilho "${label || node.id}" não especifica o evento de disparo ou origem da entrada.`,
          suggestion: 'Selecione a origem (ex: "CRM Manual API", "TOTVS Webhook" ou "Pedido Incluído").',
          canAutoFix: true,
          autoFixAction: 'fill_default'
        });
      }

      if (config.protheusSyncEnabled && !config.protheusTable) {
        missingConfigNodeIdsSet.add(node.id);
        issues.push({
          id: `err-trigger-protheus-table-${node.id}`,
          type: 'error',
          category: 'missing_config',
          nodeId: node.id,
          nodeLabel: label || node.id,
          title: 'Tabela Protheus Ausente no Gatilho',
          message: `A integração TOTVS Protheus está ativada no gatilho "${label || node.id}", mas nenhuma tabela foi vinculada.`,
          suggestion: 'Selecione a tabela ERP correspondente (ex: "SC5 - Pedidos de Venda" ou "SA1 - Clientes").',
          canAutoFix: true,
          autoFixAction: 'fill_default'
        });
      }

      // Check if trigger has at least 1 outgoing edge
      if (outEdges.length === 0) {
        issues.push({
          id: `warn-trigger-no-target-${node.id}`,
          type: 'warning',
          category: 'missing_config',
          nodeId: node.id,
          nodeLabel: label || node.id,
          title: 'Gatilho Sem Próxima Etapa',
          message: `O gatilho "${label || node.id}" não aciona nenhum nó subsequente.`,
          suggestion: 'Conecte o gatilho à primeira ação ou decisão do processo.'
        });
      }
    }

    // 5.3 Condition Node Mandatory Config
    else if (type === 'condition') {
      // Condition branching validation
      if (outEdges.length === 0) {
        missingConfigNodeIdsSet.add(node.id);
        issues.push({
          id: `err-condition-no-outputs-${node.id}`,
          type: 'error',
          category: 'missing_config',
          nodeId: node.id,
          nodeLabel: label || node.id,
          title: 'Decisão Sem Caminhos de Saída',
          message: `A condição de decisão "${label || node.id}" não possui nenhuma conexão de saída. O fluxo travará aqui.`,
          suggestion: 'Conecte as saídas de "Sim/Aprovado" e "Não/Rejeitado" para direcionar o processo.'
        });
      } else if (outEdges.length < 2) {
        issues.push({
          id: `warn-condition-single-output-${node.id}`,
          type: 'warning',
          category: 'missing_config',
          nodeId: node.id,
          nodeLabel: label || node.id,
          title: 'Decisão com Ramificação Incompleta',
          message: `A condição "${label || node.id}" possui apenas 1 saída conectada. Decisões normalmente exigem alternativas (Sim / Não).`,
          suggestion: 'Conecte o segundo caminho condicional para cobrir o cenário de reprovação ou desvio.'
        });
      }

      // Missing Rule Parameters Check
      const hasField = Boolean(config.field?.trim());
      const hasOperator = Boolean(config.operator?.trim());
      const hasValue = config.value !== undefined && String(config.value).trim() !== '';

      if (!hasField || !hasOperator || !hasValue) {
        missingConfigNodeIdsSet.add(node.id);
        const missingFields: string[] = [];
        if (!hasField) missingFields.push('Campo de Teste');
        if (!hasOperator) missingFields.push('Operador Lógico');
        if (!hasValue) missingFields.push('Valor de Referência');

        issues.push({
          id: `err-condition-rule-params-${node.id}`,
          type: 'error',
          category: 'missing_config',
          nodeId: node.id,
          nodeLabel: label || node.id,
          title: 'Critério de Decisão Incompleto',
          message: `A condição "${label || node.id}" está com parâmetros ausentes: ${missingFields.join(', ')}.`,
          suggestion: 'Abra as propriedades do nó e defina campo, operador e valor para a regra lógica.',
          canAutoFix: true,
          autoFixAction: 'fill_default'
        });
      }
    }

    // 5.4 Connector / ERP Node Mandatory Config
    else if (type === 'connector') {
      const hasEndpoint = Boolean(config.connectorEndpoint?.trim() || config.erpEndpoint?.trim());
      const hasTable = Boolean(config.protheusTable?.trim());
      const hasConnectorId = Boolean(config.connectorId?.trim());

      if (!hasEndpoint && !hasTable && !hasConnectorId) {
        missingConfigNodeIdsSet.add(node.id);
        issues.push({
          id: `err-connector-endpoint-${node.id}`,
          type: 'error',
          category: 'missing_config',
          nodeId: node.id,
          nodeLabel: label || node.id,
          title: 'Conector de Integração Sem Destino / Tabela',
          message: `O conector "${label || node.id}" não especifica endpoint de API nem tabela TOTVS Protheus.`,
          suggestion: 'Selecione uma tabela Protheus (ex: "SC5 - Pedidos de Venda") ou informe uma rota REST válida.',
          canAutoFix: true,
          autoFixAction: 'fill_default'
        });
      }
    }

    // 5.5 Validator / Compliance Node Mandatory Config
    else if (type === 'validator') {
      const hasRule = Boolean(config.validationRule?.trim());
      const hasScore = config.scoreThreshold !== undefined && config.scoreThreshold !== '';
      const hasSeverity = Boolean(config.alertSeverity?.trim());

      if (!hasRule && !hasScore && !hasSeverity) {
        missingConfigNodeIdsSet.add(node.id);
        issues.push({
          id: `err-validator-rule-${node.id}`,
          type: 'error',
          category: 'missing_config',
          nodeId: node.id,
          nodeLabel: label || node.id,
          title: 'Validador Sem Regra de Compliance',
          message: `O validador de governança "${label || node.id}" não possui regra estatutária, alçada ou score configurado.`,
          suggestion: 'Defina a regra de auditoria ou piso de aprovação no inspetor de propriedades.',
          canAutoFix: true,
          autoFixAction: 'fill_default'
        });
      }
    }

    // 5.6 Operation / Calculation / SLA Node Mandatory Config
    else if (type === 'operation') {
      const hasFormula = Boolean(config.formula?.trim());
      const hasDelay =
        config.delayDays !== undefined ||
        config.delayHours !== undefined ||
        config.timerDuration !== undefined;

      if (!hasFormula && !hasDelay) {
        missingConfigNodeIdsSet.add(node.id);
        issues.push({
          id: `err-operation-formula-${node.id}`,
          type: 'error',
          category: 'missing_config',
          nodeId: node.id,
          nodeLabel: label || node.id,
          title: 'Operação Sem Fórmula ou Temporizador de SLA',
          message: `O nó de operação "${label || node.id}" não possui fórmula de cálculo nem temporizador configurado.`,
          suggestion: 'Informe uma expressão de cálculo ou configure o período de tolerância em horas/dias.',
          canAutoFix: true,
          autoFixAction: 'fill_default'
        });
      }
    }

    // 5.7 Action Node Mandatory Config
    else if (type === 'action') {
      const hasActionOutcome = Boolean(
        config.emailTemplate?.trim() ||
        config.assigneeGroup?.trim() ||
        config.slackChannel?.trim() ||
        config.whatsappTemplate?.trim() ||
        config.actionOutcome?.trim() ||
        config.notificationType?.trim()
      );

      if (!hasActionOutcome) {
        missingConfigNodeIdsSet.add(node.id);
        issues.push({
          id: `err-action-target-${node.id}`,
          type: 'error',
          category: 'missing_config',
          nodeId: node.id,
          nodeLabel: label || node.id,
          title: 'Ação Comercial Sem Destinatário ou Modelo',
          message: `A ação "${label || node.id}" não possui modelo de e-mail, grupo responsável ou resultado configurado.`,
          suggestion: 'Defina o grupo de atendimento, modelo de comunicação ou canal de envio no painel de propriedades.',
          canAutoFix: true,
          autoFixAction: 'fill_default'
        });
      }
    }
  });

  // Collect ID sets
  const errorNodeIds = Array.from(
    new Set(
      issues
        .filter((i) => i.type === 'error' && i.nodeId)
        .map((i) => i.nodeId as string)
    )
  );

  const warningNodeIds = Array.from(
    new Set(
      issues
        .filter((i) => i.type === 'warning' && i.nodeId)
        .map((i) => i.nodeId as string)
    )
  );

  const errorEdgeIds = Array.from(
    new Set([
      ...Array.from(danglingEdgeIds),
      ...Array.from(cycleEdgeIdsSet),
      ...issues.filter((i) => i.type === 'error' && i.edgeId).map((i) => i.edgeId as string)
    ])
  );

  const errorsCount = issues.filter((i) => i.type === 'error').length;
  const warningsCount = issues.filter((i) => i.type === 'warning').length;

  return {
    isValid: errorsCount === 0,
    hasErrors: errorsCount > 0,
    errorsCount,
    warningsCount,
    issues,
    validatedAt: new Date().toLocaleTimeString('pt-BR'),
    errorNodeIds,
    warningNodeIds,
    errorEdgeIds,
    cycleNodeIds: Array.from(cycleNodeIdsSet),
    unreachableNodeIds: Array.from(unreachableNodeIdsSet),
    missingConfigNodeIds: Array.from(missingConfigNodeIdsSet)
  };
}

/**
 * Auto-Fix Utilities for Workflows
 */

/**
 * Removes unreachable/isolated nodes and any edges attached to them.
 */
export function removeUnreachableNodes(
  nodes: Node<CRMNodeData>[],
  edges: Edge[],
  unreachableIds: string[]
): { nodes: Node<CRMNodeData>[]; edges: Edge[]; removedCount: number } {
  const unreachSet = new Set(unreachableIds);
  const updatedNodes = nodes.filter((n) => !unreachSet.has(n.id));
  const validNodeIds = new Set(updatedNodes.map((n) => n.id));
  const updatedEdges = edges.filter(
    (e) => validNodeIds.has(e.source) && validNodeIds.has(e.target)
  );

  return {
    nodes: updatedNodes,
    edges: updatedEdges,
    removedCount: nodes.length - updatedNodes.length
  };
}

/**
 * Breaks circular dependency loops by removing the offending cycle edges.
 */
export function breakCycles(
  edges: Edge[],
  cycleEdgeIds: string[]
): { edges: Edge[]; removedCount: number } {
  const cycleSet = new Set(cycleEdgeIds);
  // Also remove self loops
  const updatedEdges = edges.filter((e) => !cycleSet.has(e.id) && e.source !== e.target);
  return {
    edges: updatedEdges,
    removedCount: edges.length - updatedEdges.length
  };
}

/**
 * Fills standard default configurations for nodes with missing mandatory fields.
 */
export function fillDefaultConfigurations(
  nodes: Node<CRMNodeData>[]
): Node<CRMNodeData>[] {
  return nodes.map((node) => {
    const type = node.data?.type || node.type?.replace('Node', '');
    const currentConfig = { ...(node.data?.config || {}) };
    let updatedLabel = node.data?.label;

    if (!updatedLabel || updatedLabel.trim() === '' || updatedLabel.toLowerCase().includes('novo nó')) {
      const typeTitles: Record<string, string> = {
        trigger: 'Gatilho de Início',
        condition: 'Validação de Alçada',
        action: 'Notificação Comercial',
        operation: 'Cálculo de Margem',
        validator: 'Trava de Compliance',
        connector: 'Integração TOTVS Protheus',
        businessRule: 'Regra de Negócio (Governança)'
      };
      updatedLabel = typeTitles[type] || 'Etapa do Fluxo';
    }

    if (type === 'trigger') {
      if (!currentConfig.source && !currentConfig.protheusTriggerEvent) {
        currentConfig.source = 'CRM Manual API';
      }
      if (currentConfig.protheusSyncEnabled && !currentConfig.protheusTable) {
        currentConfig.protheusTable = 'SC5 - Pedidos de Venda';
      }
    } else if (type === 'businessRule') {
      if (currentConfig.maxDiscountPct === undefined) {
        currentConfig.maxDiscountPct = 8;
        currentConfig.maxDiscountManagerPct = 15;
        currentConfig.minMarginPct = 25;
        currentConfig.maxPaymentTermDays = 60;
        currentConfig.maxVolumeWithoutApproval = 50000;
        currentConfig.governanceSyncStatus = 'synced';
        currentConfig.governanceVersion = 3;
        currentConfig.connectedDocumentTitle = 'Manual de Diretrizes de Preço e Desconto v3.2.pdf';
        currentConfig.connectedClauseNumber = 'Cláusula 4.1';
        currentConfig.connectedClauseTitle = 'Alçadas Comerciais e Piso de Rentabilidade';
      }
    } else if (type === 'condition') {
      if (!currentConfig.field) currentConfig.field = 'Valor Total';
      if (!currentConfig.operator) currentConfig.operator = '>=';
      if (currentConfig.value === undefined || currentConfig.value === '') {
        currentConfig.value = 'R$ 50.000';
      }
    } else if (type === 'action') {
      if (
        !currentConfig.emailTemplate &&
        !currentConfig.assigneeGroup &&
        !currentConfig.actionOutcome
      ) {
        currentConfig.actionOutcome = 'Notificação e Registro em Auditoria';
        currentConfig.emailTemplate = 'Modelo Padrão de Atualização';
      }
    } else if (type === 'operation') {
      if (!currentConfig.formula && currentConfig.delayHours === undefined) {
        currentConfig.formula = 'Margem = (Receita - Custos) / Receita * 100';
      }
    } else if (type === 'validator') {
      if (!currentConfig.validationRule && currentConfig.scoreThreshold === undefined) {
        currentConfig.validationRule = 'Piso Estatutário de Margem e Crédito';
        currentConfig.alertSeverity = 'high';
      }
    } else if (type === 'connector') {
      if (!currentConfig.protheusTable && !currentConfig.connectorEndpoint) {
        currentConfig.protheusTable = 'SC5 - Pedidos de Venda';
        currentConfig.connectorEndpoint = '/api/v1/salesorders';
        currentConfig.connectorProtocol = 'REST';
      }
    }

    return {
      ...node,
      data: {
        ...node.data,
        label: updatedLabel,
        config: currentConfig
      }
    };
  });
}

/**
 * Removes dangling edges whose source or target node no longer exists.
 */
export function cleanDanglingEdges(
  nodes: Node<CRMNodeData>[],
  edges: Edge[]
): { edges: Edge[]; removedCount: number } {
  const nodeIds = new Set(nodes.map((n) => n.id));
  const validEdges = edges.filter(
    (e) => nodeIds.has(e.source) && nodeIds.has(e.target)
  );
  return {
    edges: validEdges,
    removedCount: edges.length - validEdges.length
  };
}

/**
 * Topological / Layered Auto-Layout Algorithm for Workflow Canvas
 * Organizes nodes cleanly into columns/layers to remove overlaps.
 */
export function layoutWorkflowNodes(
  nodes: Node<CRMNodeData>[],
  edges: Edge[],
  direction: 'LR' | 'TB' = 'LR'
): Node<CRMNodeData>[] {
  if (nodes.length === 0) return [];

  const nodeMap = new Map<string, Node<CRMNodeData>>();
  nodes.forEach((n) => nodeMap.set(n.id, n));

  // Build graph representations
  const adj = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  nodes.forEach((n) => {
    adj.set(n.id, []);
    inDegree.set(n.id, 0);
  });

  edges.forEach((edge) => {
    if (nodeMap.has(edge.source) && nodeMap.has(edge.target)) {
      adj.get(edge.source)?.push(edge.target);
      inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
    }
  });

  // Assign layers using longest path from root nodes
  const layers = new Map<string, number>();
  const queue: { id: string; depth: number }[] = [];

  // Start with nodes that have inDegree === 0 (roots / triggers)
  nodes.forEach((n) => {
    if ((inDegree.get(n.id) || 0) === 0) {
      queue.push({ id: n.id, depth: 0 });
      layers.set(n.id, 0);
    }
  });

  // Fallback if all nodes are in a cycle or no root found
  if (queue.length === 0 && nodes.length > 0) {
    queue.push({ id: nodes[0].id, depth: 0 });
    layers.set(nodes[0].id, 0);
  }

  // BFS / Longest path depth calculation
  const visitedCount = new Map<string, number>();

  while (queue.length > 0) {
    const { id, depth } = queue.shift()!;
    const currentDepth = layers.get(id) || 0;
    const effectiveDepth = Math.max(currentDepth, depth);
    layers.set(id, effectiveDepth);

    const neighbors = adj.get(id) || [];
    for (const neighborId of neighbors) {
      const vCount = (visitedCount.get(neighborId) || 0) + 1;
      visitedCount.set(neighborId, vCount);

      const nextDepth = effectiveDepth + 1;
      const prevNeighborDepth = layers.get(neighborId) ?? -1;

      if (nextDepth > prevNeighborDepth) {
        layers.set(neighborId, nextDepth);
        // Avoid infinite loop in cyclic graphs by capping depth
        if (vCount < nodes.length * 2) {
          queue.push({ id: neighborId, depth: nextDepth });
        }
      }
    }
  }

  // Ensure every node is assigned a layer
  nodes.forEach((n) => {
    if (!layers.has(n.id)) {
      layers.set(n.id, 0);
    }
  });

  // Group nodes by layer
  const layerGroups = new Map<number, string[]>();
  layers.forEach((layerIndex, nodeId) => {
    if (!layerGroups.has(layerIndex)) {
      layerGroups.set(layerIndex, []);
    }
    layerGroups.get(layerIndex)!.push(nodeId);
  });

  // Layout spacing constants
  const isHorizontal = direction === 'LR';
  const RANK_SPACING = isHorizontal ? 340 : 200; // X distance between layers
  const NODE_SPACING = isHorizontal ? 170 : 300; // Y distance between nodes in same layer
  const START_X = 80;
  const START_Y = 120;

  const updatedNodes = nodes.map((node) => {
    const layerIndex = layers.get(node.id) || 0;
    const nodesInSameLayer = layerGroups.get(layerIndex) || [node.id];
    const indexInLayer = nodesInSameLayer.indexOf(node.id);

    // Center nodes in layer vertically relative to largest layer
    const totalLayerHeight = (nodesInSameLayer.length - 1) * NODE_SPACING;
    const startYOffset = START_Y - totalLayerHeight / 2;

    let posX = START_X + layerIndex * RANK_SPACING;
    let posY = startYOffset + indexInLayer * NODE_SPACING;

    if (!isHorizontal) {
      posX = START_X + indexInLayer * NODE_SPACING;
      posY = START_Y + layerIndex * RANK_SPACING;
    }

    return {
      ...node,
      position: {
        x: Math.round(posX),
        y: Math.round(posY)
      }
    };
  });

  return updatedNodes;
}

