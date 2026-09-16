import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Play, Sliders, CheckCircle, ShieldAlert, Cpu, 
  Trash2, Plus, ArrowRight, RefreshCw, Settings, 
  Sparkles, HelpCircle, AlertCircle, Save, Layers, Info
} from "lucide-react";
import { toast } from "sonner";

export interface CanvasNode {
  id: string;
  type: "inicio" | "decisao" | "acao" | "validador" | "fim";
  label: string;
  x: number;
  y: number;
  config: {
    marginMinima?: number;
    descontoMaximo?: number;
    bonusPercentual?: number;
    msgErro?: string;
    regraNome?: string;
  };
}

export interface CanvasEdge {
  id: string;
  from: string;
  to: string;
  label?: string;
}

const DEFAULT_NODES: CanvasNode[] = [
  {
    id: "node-1",
    type: "inicio",
    label: "Entrada do Pedido ERP",
    x: 250,
    y: 20,
    config: {}
  },
  {
    id: "node-2",
    type: "decisao",
    label: "Validação de Margem",
    x: 250,
    y: 130,
    config: { marginMinima: 5 }
  },
  {
    id: "node-3",
    type: "decisao",
    label: "Aprovação de Alçada",
    x: 80,
    y: 250,
    config: { descontoMaximo: 15 }
  },
  {
    id: "node-4",
    type: "validador",
    label: "Bloqueio Margem Crítica",
    x: 420,
    y: 250,
    config: { msgErro: "Pedido com margem de lucro abaixo do limite regulamentar" }
  },
  {
    id: "node-5",
    type: "acao",
    label: "Aplicar Bônus Q3",
    x: 80,
    y: 370,
    config: { bonusPercentual: 1.5 }
  },
  {
    id: "node-6",
    type: "fim",
    label: "Integração Protheus",
    x: 250,
    y: 490,
    config: {}
  }
];

const DEFAULT_EDGES: CanvasEdge[] = [
  { id: "edge-1", from: "node-1", to: "node-2" },
  { id: "edge-2", from: "node-2", to: "node-3", label: "Margem >= 5%" },
  { id: "edge-3", from: "node-2", to: "node-4", label: "Margem < 5%" },
  { id: "edge-4", from: "node-3", to: "node-5", label: "Autorizado" },
  { id: "edge-5", from: "node-5", to: "node-6" },
  { id: "edge-6", from: "node-4", to: "node-6", label: "Aprov. Supervisor" }
];

export default function FlowStudioCanvas() {
  const [nodes, setNodes] = useState<CanvasNode[]>(DEFAULT_NODES);
  const [edges, setEdges] = useState<CanvasEdge[]>(DEFAULT_EDGES);
  
  // Drag and drop states (sidebar to canvas)
  const [draggingType, setDraggingType] = useState<CanvasNode["type"] | null>(null);
  
  // In-canvas node drag-and-reposition states
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  // Connection tool states
  const [isConnecting, setIsConnecting] = useState(false);
  const [sourceNodeId, setSourceNodeId] = useState<string | null>(null);

  // Selected Node (for property editor)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>("node-2");

  // Simulation parameters for interactive flow testing
  const [simParams, setSimParams] = useState({
    valorBase: 15000,
    margem: 4.2, // fits Critical Margin Block by default
    desconto: 12
  });
  const [activeSimulationPath, setActiveSimulationPath] = useState<string[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);

  // Handle Drag Start from Sidebar
  const handleSidebarDragStart = (type: CanvasNode["type"]) => {
    setDraggingType(type);
  };

  // Handle Drop on Canvas
  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggingType || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    // Calculate position relative to container
    let dropX = e.clientX - rect.left - 100; // Offset card half-width
    let dropY = e.clientY - rect.top - 35;   // Offset card half-height

    // Clamp inside canvas bounds
    dropX = Math.max(10, Math.min(rect.width - 210, dropX));
    dropY = Math.max(10, Math.min(rect.height - 80, dropY));

    // Snap to grid of 10px
    dropX = Math.round(dropX / 10) * 10;
    dropY = Math.round(dropY / 10) * 10;

    const newId = `node-${Date.now()}`;
    const defaultLabels: Record<CanvasNode["type"], string> = {
      inicio: "Novo Início de Fluxo",
      decisao: "Condicional Comercial",
      acao: "Aplicar Bônus",
      validador: "Bloqueio Regulatório",
      fim: "Finalização ERP"
    };

    const newNode: CanvasNode = {
      id: newId,
      type: draggingType,
      label: defaultLabels[draggingType],
      x: dropX,
      y: dropY,
      config: draggingType === "decisao" 
        ? { marginMinima: 5 } 
        : draggingType === "acao" 
        ? { bonusPercentual: 1.0 } 
        : draggingType === "validador" 
        ? { msgErro: "Alerta de conformidade de regras de alçada" } 
        : {}
    };

    setNodes(prev => [...prev, newNode]);
    setSelectedNodeId(newId);
    setDraggingType(null);
    toast.success("Nó adicionado ao fluxo! Arraste para posicionar.");
  };

  // Node Drag and Reposition within Canvas
  const handleNodeMouseDown = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveDragId(id);
    const node = nodes.find(n => n.id === id);
    if (node) {
      dragOffset.current = {
        x: e.clientX - node.x,
        y: e.clientY - node.y
      };
    }
    setSelectedNodeId(id);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (!activeDragId || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    let newX = e.clientX - dragOffset.current.x;
    let newY = e.clientY - dragOffset.current.y;

    // Boundary constraints
    newX = Math.max(5, Math.min(rect.width - 210, newX));
    newY = Math.max(5, Math.min(rect.height - 80, newY));

    // Snap to 5px grid
    newX = Math.round(newX / 5) * 5;
    newY = Math.round(newY / 5) * 5;

    setNodes(prev => prev.map(node => {
      if (node.id === activeDragId) {
        return { ...node, x: newX, y: newY };
      }
      return node;
    }));
  };

  const handleGlobalMouseUp = () => {
    setActiveDragId(null);
  };

  useEffect(() => {
    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => {
      window.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, []);

  // Connect Nodes Logic
  const startConnection = (id: string) => {
    setIsConnecting(true);
    setSourceNodeId(id);
    toast.info("Clique no próximo nó para finalizar a conexão.");
  };

  const finishConnection = (targetId: string) => {
    if (!sourceNodeId) return;
    if (sourceNodeId === targetId) {
      toast.error("Não é possível conectar um nó a ele mesmo.");
      setIsConnecting(false);
      setSourceNodeId(null);
      return;
    }

    // Check if edge already exists
    const exists = edges.some(e => e.from === sourceNodeId && e.to === targetId);
    if (exists) {
      toast.warning("Esta conexão já existe.");
    } else {
      const newEdge: CanvasEdge = {
        id: `edge-${Date.now()}`,
        from: sourceNodeId,
        to: targetId,
        label: nodes.find(n => n.id === sourceNodeId)?.type === "decisao" ? "Condição" : undefined
      };
      setEdges(prev => [...prev, newEdge]);
      toast.success("Conexão estabelecida com sucesso!");
    }

    setIsConnecting(false);
    setSourceNodeId(null);
  };

  // Delete Node and its associated edges
  const deleteNode = (id: string) => {
    setNodes(prev => prev.filter(n => n.id !== id));
    setEdges(prev => prev.filter(e => e.from !== id && e.to !== id));
    if (selectedNodeId === id) setSelectedNodeId(null);
    toast.success("Nó excluído do fluxo.");
  };

  // Delete specific connection edge
  const deleteEdge = (edgeId: string) => {
    setEdges(prev => prev.filter(e => e.id !== edgeId));
    toast.success("Conexão removida.");
  };

  // Clear Canvas completely
  const handleClearCanvas = () => {
    setNodes([]);
    setEdges([]);
    setSelectedNodeId(null);
    toast.info("Tela limpa! Comece a criar arrastando elementos.");
  };

  // Reset to default flowchart template
  const handleResetTemplate = () => {
    setNodes(DEFAULT_NODES);
    setEdges(DEFAULT_EDGES);
    setSelectedNodeId("node-2");
    toast.success("Modelo BPMN padrão carregado!");
  };

  // Edit Node Properties
  const updateSelectedNode = (updater: (node: CanvasNode) => CanvasNode) => {
    if (!selectedNodeId) return;
    setNodes(prev => prev.map(n => n.id === selectedNodeId ? updater(n) : n));
  };

  // Run Path Simulation in Canvas
  const handleSimulatePath = () => {
    setIsSimulating(true);
    setActiveSimulationPath([]);

    // Determine the route based on simulated values
    const path: string[] = ["node-1", "node-2"];
    
    // Evaluate Node 2: Margin check
    if (simParams.margem >= 5) {
      path.push("node-3");
      // Evaluate Node 3: Discount Check
      if (simParams.desconto <= 15) {
        path.push("node-5"); // Safe, apply bonus
        path.push("node-6"); // Complete integration
      } else {
        path.push("node-6"); // Over discount, normal flow directly
      }
    } else {
      path.push("node-4"); // Critical Margin Triggered
      path.push("node-6"); // Supervisor override block path
    }

    // Sequentially highlight nodes to animate the flowchart traversal
    let currentIdx = 0;
    const interval = setInterval(() => {
      if (currentIdx < path.length) {
        setActiveSimulationPath(prev => [...prev, path[currentIdx]]);
        currentIdx++;
      } else {
        clearInterval(interval);
        setIsSimulating(false);
        const finalStatus = simParams.margem < 5 
          ? "Bloqueado para aprovação manual" 
          : "Faturamento Automático Aprovado!";
        toast.info(`Simulação finalizada: ${finalStatus}`, { duration: 5000 });
      }
    }, 1000);
  };

  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
      {/* 1. Left Sidebar: Draggable items and presets */}
      <div className="xl:col-span-1 space-y-6">
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800/60 rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-neutral-800 dark:text-neutral-100 flex items-center gap-1.5 mb-3">
            <Layers className="h-4 w-4 text-primary" /> Construtor de Fluxos
          </h3>
          <p className="text-xs text-neutral-400 mb-4">
            Arraste e solte os botões abaixo na tela quadriculada para criar novos nós no seu fluxo comercial.
          </p>

          {/* Draggable components toolbox */}
          <div className="space-y-3">
            <div
              draggable
              onDragStart={() => handleSidebarDragStart("inicio")}
              className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/50 dark:border-indigo-800/30 rounded-xl flex items-center gap-2 cursor-grab active:cursor-grabbing hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-all text-indigo-700 dark:text-indigo-300"
            >
              <div className="p-2 rounded-lg bg-indigo-500/10 shrink-0">
                <Play className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold">1. Início do Fluxo</p>
                <p className="text-[10px] opacity-80">Trigger de entrada ERP</p>
              </div>
            </div>

            <div
              draggable
              onDragStart={() => handleSidebarDragStart("decisao")}
              className="p-3 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/30 rounded-xl flex items-center gap-2 cursor-grab active:cursor-grabbing hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-all text-amber-700 dark:text-amber-300"
            >
              <div className="p-2 rounded-lg bg-amber-500/10 shrink-0">
                <Sliders className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold">2. Decisão (Condicional)</p>
                <p className="text-[10px] opacity-80">Ramo de margem/desconto</p>
              </div>
            </div>

            <div
              draggable
              onDragStart={() => handleSidebarDragStart("acao")}
              className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/30 rounded-xl flex items-center gap-2 cursor-grab active:cursor-grabbing hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-all text-emerald-700 dark:text-emerald-300"
            >
              <div className="p-2 rounded-lg bg-emerald-500/10 shrink-0">
                <CheckCircle className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold">3. Ação (Bônus/Taxas)</p>
                <p className="text-[10px] opacity-80">Soma bônus ou comissão</p>
              </div>
            </div>

            <div
              draggable
              onDragStart={() => handleSidebarDragStart("validador")}
              className="p-3 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/50 dark:border-rose-800/30 rounded-xl flex items-center gap-2 cursor-grab active:cursor-grabbing hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all text-rose-700 dark:text-rose-300"
            >
              <div className="p-2 rounded-lg bg-rose-500/10 shrink-0">
                <ShieldAlert className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold">4. Validador (Bloqueio)</p>
                <p className="text-[10px] opacity-80">Alçada crítica ou supervisor</p>
              </div>
            </div>

            <div
              draggable
              onDragStart={() => handleSidebarDragStart("fim")}
              className="p-3 bg-violet-50/50 dark:bg-violet-950/20 border border-violet-200/50 dark:border-violet-800/30 rounded-xl flex items-center gap-2 cursor-grab active:cursor-grabbing hover:bg-violet-50 dark:hover:bg-violet-950/30 transition-all text-violet-700 dark:text-violet-300"
            >
              <div className="p-2 rounded-lg bg-violet-500/10 shrink-0">
                <Cpu className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold">5. Fim do Processo</p>
                <p className="text-[10px] opacity-80">Gravação Protheus ERP</p>
              </div>
            </div>
          </div>
        </div>

        {/* Presets and template controls */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800/60 rounded-xl p-4 shadow-sm space-y-2">
          <span className="text-[10px] font-bold uppercase text-neutral-400">Modelos Rápidos</span>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleResetTemplate}
              className="py-1.5 px-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs rounded-lg flex items-center justify-center gap-1 font-semibold border border-neutral-200/40 dark:border-neutral-700/40 transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Recarregar
            </button>
            <button
              onClick={handleClearCanvas}
              className="py-1.5 px-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 text-rose-700 dark:text-rose-400 text-xs rounded-lg flex items-center justify-center gap-1 font-semibold border border-rose-100 dark:border-rose-900/30 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" /> Limpar Tela
            </button>
          </div>
        </div>
      </div>

      {/* 2. Middle Grid Canvas Area */}
      <div className="xl:col-span-2 flex flex-col space-y-4">
        {/* Canvas Toolbar controls */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800/60 rounded-xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-primary/5 text-primary rounded-lg">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xs font-bold text-neutral-800 dark:text-neutral-100">Simulador de Alçada Integrado</p>
              <p className="text-[10px] text-neutral-400">Modifique os valores para testar caminhos determinísticos</p>
            </div>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              <span className="text-neutral-400">Margem:</span>
              <input
                type="number"
                value={simParams.margem}
                onChange={(e) => setSimParams(prev => ({ ...prev, margem: Number(e.target.value) }))}
                className="w-14 h-7 text-xs border border-neutral-200 dark:border-neutral-800 rounded px-1.5 text-center bg-transparent"
              />
              <span className="text-neutral-400">%</span>
            </div>
            
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              <span className="text-neutral-400">Desconto:</span>
              <input
                type="number"
                value={simParams.desconto}
                onChange={(e) => setSimParams(prev => ({ ...prev, desconto: Number(e.target.value) }))}
                className="w-14 h-7 text-xs border border-neutral-200 dark:border-neutral-800 rounded px-1.5 text-center bg-transparent"
              />
              <span className="text-neutral-400">%</span>
            </div>

            <button
              onClick={handleSimulatePath}
              disabled={isSimulating}
              className={`py-1.5 px-3 bg-primary text-white hover:bg-primary/95 text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-sm transition-opacity ${
                isSimulating ? "opacity-50 cursor-not-allowed animate-pulse" : ""
              }`}
            >
              <Play className="h-3.5 w-3.5" /> Simular Fluxo
            </button>
          </div>
        </div>

        {/* The Grid Canvas Container */}
        <div
          ref={canvasRef}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleCanvasDrop}
          onMouseMove={handleCanvasMouseMove}
          className="relative h-[580px] w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden cursor-crosshair select-none shadow-inner"
          style={{
            backgroundImage: "radial-gradient(#d1d5db 1px, transparent 1px), radial-gradient(#e5e7eb 0.5px, transparent 0.5px)",
            backgroundSize: "20px 20px, 10px 10px",
            backgroundPosition: "0 0, 10px 10px"
          }}
        >
          {/* SVG Overlay to Draw Connections */}
          <svg className="absolute inset-0 pointer-events-none w-full h-full z-10">
            <defs>
              <marker
                id="arrowhead"
                viewBox="0 0 10 10"
                refX="6"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#94a3b8" />
              </marker>
              <marker
                id="arrowhead-active"
                viewBox="0 0 10 10"
                refX="6"
                refY="5"
                markerWidth="8"
                markerHeight="8"
                orient="auto-start-reverse"
              >
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#6366f1" />
              </marker>
            </defs>

            {edges.map((edge) => {
              const fromNode = nodes.find(n => n.id === edge.from);
              const toNode = nodes.find(n => n.id === edge.to);
              if (!fromNode || !toNode) return null;

              // Calculate connection coordinates based on card sizes (210px wide, 70px tall)
              const fromX = fromNode.x + 105;
              const fromY = fromNode.y + 70; // Bottom center
              const toX = toNode.x + 105;
              const toY = toNode.y;          // Top center

              const dx = toX - fromX;
              const dy = toY - fromY;

              const isEdgeActive = activeSimulationPath.includes(edge.from) && activeSimulationPath.includes(edge.to);

              // Curved connection path calculations (BPMN style)
              let pathD = "";
              if (Math.abs(dx) < 30) {
                // Straight vertical line
                pathD = `M ${fromX} ${fromY} L ${toX} ${toY}`;
              } else {
                // S-curve connector
                const ctrlY = fromY + dy / 2;
                pathD = `M ${fromX} ${fromY} C ${fromX} ${ctrlY}, ${toX} ${ctrlY}, ${toX} ${toY}`;
              }

              return (
                <g key={edge.id}>
                  {/* Outer glow or active pulse for connection path */}
                  {isEdgeActive && (
                    <motion.path
                      d={pathD}
                      fill="none"
                      stroke="#818cf8"
                      strokeWidth="6"
                      strokeLinecap="round"
                      opacity="0.4"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.8 }}
                    />
                  )}

                  {/* Standard connection line */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke={isEdgeActive ? "#6366f1" : "#cbd5e1"}
                    strokeWidth={isEdgeActive ? 3 : 2}
                    markerEnd={`url(#${isEdgeActive ? "arrowhead-active" : "arrowhead"})`}
                    className="transition-colors duration-300"
                  />

                  {/* Optional label on path */}
                  {edge.label && (
                    <foreignObject
                      x={fromX + dx / 2 - 60}
                      y={fromY + dy / 2 - 12}
                      width="120"
                      height="24"
                      className="pointer-events-auto"
                    >
                      <div className="flex items-center justify-center">
                        <span className="px-1.5 py-0.5 bg-white dark:bg-neutral-800 border border-neutral-200/50 dark:border-neutral-700 text-[9px] font-bold rounded-md shadow-sm text-neutral-500 dark:text-neutral-400 truncate max-w-full">
                          {edge.label}
                        </span>
                      </div>
                    </foreignObject>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Draggable and interactive Node Cards in Canvas */}
          {nodes.map((node) => {
            const isNodeSelected = selectedNodeId === node.id;
            const isNodeInActiveSimulation = activeSimulationPath.includes(node.id);
            
            const nodeStyles: Record<CanvasNode["type"], { bg: string, text: string, border: string, iconColor: string }> = {
              inicio: {
                bg: "bg-indigo-50/90 dark:bg-indigo-950/30",
                text: "text-indigo-900 dark:text-indigo-200",
                border: "border-indigo-200 dark:border-indigo-800",
                iconColor: "text-indigo-600 dark:text-indigo-400"
              },
              decisao: {
                bg: "bg-amber-50/90 dark:bg-amber-950/30",
                text: "text-amber-900 dark:text-amber-200",
                border: "border-amber-200 dark:border-amber-800",
                iconColor: "text-amber-600 dark:text-amber-400"
              },
              acao: {
                bg: "bg-emerald-50/90 dark:bg-emerald-950/30",
                text: "text-emerald-900 dark:text-emerald-200",
                border: "border-emerald-200 dark:border-emerald-800",
                iconColor: "text-emerald-600 dark:text-emerald-400"
              },
              validador: {
                bg: "bg-rose-50/90 dark:bg-rose-950/30",
                text: "text-rose-900 dark:text-rose-200",
                border: "border-rose-200 dark:border-rose-800",
                iconColor: "text-rose-600 dark:text-rose-400"
              },
              fim: {
                bg: "bg-violet-50/90 dark:bg-violet-950/30",
                text: "text-violet-900 dark:text-violet-200",
                border: "border-violet-200 dark:border-violet-800",
                iconColor: "text-violet-600 dark:text-violet-400"
              }
            };

            const nodeIcon: Record<CanvasNode["type"], React.ReactNode> = {
              inicio: <Play className="h-4 w-4 fill-current" />,
              decisao: <Sliders className="h-4 w-4" />,
              acao: <CheckCircle className="h-4 w-4" />,
              validador: <ShieldAlert className="h-4 w-4" />,
              fim: <Cpu className="h-4 w-4" />
            };

            return (
              <motion.div
                key={node.id}
                onMouseDown={(e) => handleNodeMouseDown(node.id, e)}
                style={{
                  position: "absolute",
                  left: node.x,
                  top: node.y,
                  width: "210px",
                  height: "70px",
                  zIndex: isNodeSelected ? 30 : 20
                }}
                className={`rounded-xl border shadow-sm p-3 flex flex-col justify-between transition-shadow cursor-grab active:cursor-grabbing backdrop-blur-sm ${
                  isNodeSelected 
                    ? "border-primary ring-2 ring-primary/20 shadow-md scale-102" 
                    : nodeStyles[node.type].border
                } ${
                  isNodeInActiveSimulation 
                    ? "ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-neutral-900 scale-102 animate-pulse bg-white dark:bg-neutral-800" 
                    : nodeStyles[node.type].bg
                }`}
              >
                {/* Node Top Row Header */}
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className={`p-1 bg-white/60 dark:bg-neutral-900/60 rounded-lg shrink-0 ${nodeStyles[node.type].iconColor}`}>
                      {nodeIcon[node.type]}
                    </span>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-neutral-400 truncate">
                      {node.type === "inicio" ? "Início" : node.type === "fim" ? "Fim" : node.type}
                    </span>
                  </div>

                  {/* Connection Trigger Anchor Dot */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isConnecting) finishConnection(node.id);
                        else startConnection(node.id);
                      }}
                      title="Conectar a outro nó"
                      className={`h-3.5 w-3.5 rounded-full flex items-center justify-center transition-colors ${
                        isConnecting && sourceNodeId === node.id
                          ? "bg-indigo-500 text-white animate-ping"
                          : isConnecting
                          ? "bg-emerald-500 text-white hover:bg-emerald-600 cursor-pointer"
                          : "bg-neutral-200 hover:bg-neutral-300 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-500"
                      }`}
                    >
                      <Plus className="h-2 w-2" />
                    </button>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNode(node.id);
                      }}
                      className="h-3.5 w-3.5 rounded-md hover:bg-rose-100 dark:hover:bg-rose-950/50 flex items-center justify-center text-neutral-400 hover:text-rose-600 transition-colors"
                    >
                      <Trash2 className="h-2 w-2" />
                    </button>
                  </div>
                </div>

                {/* Node Main Label Text */}
                <p className={`text-xs font-bold leading-tight truncate mt-1 ${nodeStyles[node.type].text}`}>
                  {node.label}
                </p>

                {/* Node Specific Sub-metadata preview */}
                <p className="text-[9px] text-neutral-400 font-semibold truncate leading-none">
                  {node.type === "decisao" && node.config.marginMinima !== undefined && `Margem Min: ${node.config.marginMinima}%`}
                  {node.type === "decisao" && node.config.descontoMaximo !== undefined && `Desc Máx: ${node.config.descontoMaximo}%`}
                  {node.type === "acao" && node.config.bonusPercentual !== undefined && `Bônus: +${node.config.bonusPercentual}%`}
                  {node.type === "validador" && (node.config.msgErro ? "Ação: Bloqueio" : "Validador")}
                  {node.type === "inicio" && "Entrada"}
                  {node.type === "fim" && "Gravação ERP"}
                </p>
              </motion.div>
            );
          })}

          {/* Empty state instruction on clean canvas */}
          {nodes.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-white/20 dark:bg-black/20 pointer-events-none">
              <Layers className="h-10 w-10 text-neutral-300 dark:text-neutral-700 mb-2 animate-bounce" />
              <p className="text-sm font-bold text-neutral-500 dark:text-neutral-400">O canvas está vazio</p>
              <p className="text-xs text-neutral-400 max-w-sm mt-1">
                Arraste novos componentes da barra lateral esquerda e solte-os aqui para começar a modelar os fluxos de aprovação de vendas.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 3. Right Sidebar: Selected Node Property Editor Inspector */}
      <div className="xl:col-span-1 space-y-6">
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800/60 rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-neutral-800 dark:text-neutral-100 flex items-center gap-1.5 border-b border-neutral-100 dark:border-neutral-800 pb-3">
            <Settings className="h-4 w-4 text-primary" /> Inspetor de Nós
          </h3>

          {selectedNode ? (
            <div className="space-y-4">
              {/* Common Label Field */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-500">Nome do Nó</label>
                <input
                  type="text"
                  value={selectedNode.label}
                  onChange={(e) => updateSelectedNode(node => ({ ...node, label: e.target.value }))}
                  className="w-full h-9 text-xs border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 bg-neutral-50 dark:bg-neutral-950 focus:outline-primary font-medium"
                />
              </div>

              {/* Node Type Info Display */}
              <div className="space-y-1 bg-neutral-50 dark:bg-neutral-950 p-2.5 rounded-lg border border-neutral-200/40 dark:border-neutral-800/40">
                <span className="text-[10px] font-bold text-neutral-400 block uppercase">Informação do Tipo</span>
                <p className="text-xs font-semibold mt-0.5 capitalize">{selectedNode.type}</p>
                <p className="text-[10px] text-neutral-400 mt-1">
                  {selectedNode.type === "inicio" && "Inicia a validação da alçada de faturamento assim que um pedido é gerado pelos representantes."}
                  {selectedNode.type === "decisao" && "Analisa dinamicamente as variáveis de desconto ou margem do pedido para determinar caminhos alternativos de alçada."}
                  {selectedNode.type === "acao" && "Aplica acréscimo, decréscimo de bônus, taxa extra ou vinculação automática com as regras de campanha vigentes."}
                  {selectedNode.type === "validador" && "Impede que o faturamento continue se as margens do pedido estiverem em desacordo com as diretrizes da governança."}
                  {selectedNode.type === "fim" && "Realiza a gravação determinística de integração com Protheus ERP de forma unificada e definitiva."}
                </p>
              </div>

              {/* Node-specific configuration fields */}
              {selectedNode.type === "decisao" && (
                <div className="space-y-4 border-t border-neutral-100 dark:border-neutral-800 pt-3">
                  <h4 className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Variáveis de Validação</h4>
                  
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-neutral-500">Margem Mínima Requerida (%)</label>
                    <input
                      type="number"
                      value={selectedNode.config.marginMinima ?? ""}
                      onChange={(e) => updateSelectedNode(node => ({ 
                        ...node, 
                        config: { ...node.config, marginMinima: Number(e.target.value) } 
                      }))}
                      className="w-full h-9 text-xs border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 bg-neutral-50 dark:bg-neutral-950"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-neutral-500">Alçada Limite Desconto (%)</label>
                    <input
                      type="number"
                      value={selectedNode.config.descontoMaximo ?? ""}
                      onChange={(e) => updateSelectedNode(node => ({ 
                        ...node, 
                        config: { ...node.config, descontoMaximo: Number(e.target.value) } 
                      }))}
                      className="w-full h-9 text-xs border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 bg-neutral-50 dark:bg-neutral-950"
                    />
                  </div>
                </div>
              )}

              {selectedNode.type === "acao" && (
                <div className="space-y-4 border-t border-neutral-100 dark:border-neutral-800 pt-3">
                  <h4 className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Variáveis de Comissão</h4>
                  
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-neutral-500">Bônus Adicional de Comissão (%)</label>
                    <input
                      type="number"
                      value={selectedNode.config.bonusPercentual ?? ""}
                      onChange={(e) => updateSelectedNode(node => ({ 
                        ...node, 
                        config: { ...node.config, bonusPercentual: Number(e.target.value) } 
                      }))}
                      className="w-full h-9 text-xs border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 bg-neutral-50 dark:bg-neutral-950"
                    />
                  </div>
                </div>
              )}

              {selectedNode.type === "validador" && (
                <div className="space-y-4 border-t border-neutral-100 dark:border-neutral-800 pt-3">
                  <h4 className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Mensagem de Bloqueio</h4>
                  
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-neutral-500">Mensagem de Alerta (ERP)</label>
                    <textarea
                      value={selectedNode.config.msgErro ?? ""}
                      rows={3}
                      onChange={(e) => updateSelectedNode(node => ({ 
                        ...node, 
                        config: { ...node.config, msgErro: e.target.value } 
                      }))}
                      className="w-full text-xs border border-neutral-200 dark:border-neutral-800 rounded-lg p-2.5 bg-neutral-50 dark:bg-neutral-950 focus:outline-primary"
                    />
                  </div>
                </div>
              )}

              {/* Edge/Connector setup from Selected Node */}
              <div className="space-y-2 border-t border-neutral-100 dark:border-neutral-800 pt-3">
                <span className="text-[10px] font-bold text-neutral-400 block uppercase">Conexões Sair de {selectedNode.label}</span>
                
                {edges.filter(e => e.from === selectedNode.id).length > 0 ? (
                  <div className="space-y-1.5">
                    {edges.filter(e => e.from === selectedNode.id).map(edge => {
                      const toNode = nodes.find(n => n.id === edge.to);
                      return (
                        <div key={edge.id} className="flex items-center justify-between bg-neutral-50 dark:bg-neutral-950 p-2 border border-neutral-100 dark:border-neutral-800 rounded-lg text-xs font-semibold text-neutral-600 dark:text-neutral-300">
                          <span className="flex items-center gap-1">
                            <ArrowRight className="h-3.5 w-3.5" /> {toNode?.label || "Nó final"}
                          </span>
                          <button
                            onClick={() => deleteEdge(edge.id)}
                            className="p-1 rounded text-neutral-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-[10px] text-neutral-400 italic">Nenhum caminho de saída definido para este nó.</p>
                )}

                <div className="flex flex-col gap-1.5 mt-2">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase">Rotular Aresta</span>
                  {edges.filter(e => e.from === selectedNode.id).map(edge => (
                    <div key={edge.id} className="flex gap-1.5 items-center">
                      <span className="text-[9px] text-neutral-500 font-bold truncate max-w-[90px]">{nodes.find(n => n.id === edge.to)?.label}:</span>
                      <input
                        placeholder="Ex: Margem < 5%"
                        value={edge.label ?? ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEdges(prev => prev.map(x => x.id === edge.id ? { ...x, label: val } : x));
                        }}
                        className="h-7 text-[10px] border border-neutral-200 dark:border-neutral-800 rounded bg-transparent px-1.5 flex-1"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-6 text-center">
              <Info className="h-6 w-6 text-neutral-300 mb-1" />
              <p className="text-xs font-semibold text-neutral-400">Nenhum nó selecionado</p>
              <p className="text-[10px] text-neutral-400 mt-1">Clique em qualquer nó na tela quadriculada para inspecionar e editar suas alçadas.</p>
            </div>
          )}
        </div>

        <div className="bg-neutral-50 dark:bg-neutral-900/50 p-4 rounded-xl border border-neutral-200/50 dark:border-neutral-800/50 flex gap-2">
          <AlertCircle className="h-4.5 w-4.5 text-indigo-500 shrink-0 mt-0.5" />
          <p className="text-[10px] text-neutral-500 leading-normal">
            As modelagens salvas no Flow Studio atualizam diretamente o validador de alçada que analisa os pedidos oriundos de qualquer canal parceiro.
          </p>
        </div>
      </div>
    </div>
  );
}
