import { DocumentBlock, BlockInternalElement, ReusableBlockTemplate } from "@/types/document-template";

const STORAGE_KEY = "vendasprotheus_custom_blocks_library";

// Blocos pré-configurados padrão com elementos internos compostos
export const DEFAULT_REUSABLE_BLOCKS: ReusableBlockTemplate[] = [
  {
    id: "lib-blank-canvas",
    name: "Bloco Vazio para Composição Livre",
    description: "Quadro limpo para arrastar e posicionar variáveis e componentes livremente",
    category: "layout",
    iconName: "LayoutTemplate",
    isCustom: false,
    version: 1,
    createdAt: "2026-09-01T00:00:00Z",
    block: {
      id: "block-custom-blank",
      type: "custom_block",
      title: "Bloco Livre",
      style: {
        width: "full",
        minHeight: 180,
        backgroundColor: "#ffffff",
        borderColor: "#e2e8f0",
        borderWidth: 1,
        borderRadius: 8,
        paddingTop: 16,
        paddingBottom: 16,
        paddingLeft: 16,
        paddingRight: 16,
      },
      elements: []
    }
  },
  {
    id: "lib-header-pro",
    name: "Banner de Cabeçalho Corporativo",
    description: "Cabeçalho com logo, número da proposta, data e indicador de status",
    category: "comercial",
    iconName: "Building2",
    isCustom: false,
    version: 1,
    createdAt: "2026-09-01T00:00:00Z",
    block: {
      id: "block-header-pro",
      type: "custom_block",
      title: "Cabeçalho Corporativo",
      style: {
        width: "full",
        minHeight: 120,
        backgroundColor: "#0f172a",
        borderColor: "#1e293b",
        borderWidth: 1,
        borderRadius: 8,
        paddingTop: 12,
        paddingBottom: 12,
        paddingLeft: 16,
        paddingRight: 16,
      },
      elements: [
        {
          id: "el-hp-title",
          type: "heading",
          name: "Nome da Empresa",
          x: 20,
          y: 20,
          width: 320,
          height: 32,
          zIndex: 1,
          content: "{{empresa.nome}}",
          variableTag: "{{empresa.nome}}",
          style: {
            fontSize: 20,
            fontWeight: "bold",
            textColor: "#ffffff",
          }
        },
        {
          id: "el-hp-subtitle",
          type: "text",
          name: "Subtítulo / CNPJ",
          x: 20,
          y: 56,
          width: 340,
          height: 24,
          zIndex: 1,
          content: "Soluções Corporativas Integradas • CNPJ {{empresa.cnpj}}",
          style: {
            fontSize: 12,
            textColor: "#94a3b8",
          }
        },
        {
          id: "el-hp-badge",
          type: "badge",
          name: "Badge Número Orçamento",
          x: 480,
          y: 20,
          width: 220,
          height: 38,
          zIndex: 2,
          content: "PROPOSTA: {{orcamento.numero}}",
          variableTag: "{{orcamento.numero}}",
          style: {
            backgroundColor: "#1e293b",
            textColor: "#38bdf8",
            borderColor: "#38bdf8",
            borderWidth: 1,
            borderRadius: 6,
            fontSize: 13,
            fontWeight: "bold",
            textAlign: "center",
            padding: 8,
          }
        },
        {
          id: "el-hp-dates",
          type: "text",
          name: "Datas de Emissão e Validade",
          x: 480,
          y: 65,
          width: 220,
          height: 24,
          zIndex: 1,
          content: "Emissão: {{orcamento.dataEmissao}} • Validade: {{orcamento.dataValidade}}",
          style: {
            fontSize: 11,
            textColor: "#cbd5e1",
            textAlign: "right",
          }
        }
      ]
    }
  },
  {
    id: "lib-card-client-summary",
    name: "Card de Contato & Destinatário",
    description: "Caixa destacada com informações dinâmicas do cliente e consultor",
    category: "comercial",
    iconName: "Users",
    isCustom: false,
    version: 1,
    createdAt: "2026-09-01T00:00:00Z",
    block: {
      id: "block-client-summary",
      type: "custom_block",
      title: "Dados do Destinatário",
      style: {
        width: "full",
        minHeight: 140,
        backgroundColor: "#f8fafc",
        borderColor: "#cbd5e1",
        borderWidth: 1,
        borderRadius: 8,
        paddingTop: 16,
        paddingBottom: 16,
        paddingLeft: 16,
        paddingRight: 16,
      },
      elements: [
        {
          id: "el-cs-box1",
          type: "shape",
          name: "Faixa Superior Accent",
          x: 0,
          y: 0,
          width: 720,
          height: 4,
          zIndex: 1,
          style: {
            backgroundColor: "#4f46e5",
            borderRadius: 0,
          }
        },
        {
          id: "el-cs-title",
          type: "heading",
          name: "Título Cliente",
          x: 16,
          y: 16,
          width: 320,
          height: 26,
          zIndex: 2,
          content: "{{cliente.razaoSocial}}",
          variableTag: "{{cliente.razaoSocial}}",
          style: {
            fontSize: 16,
            fontWeight: "bold",
            textColor: "#0f172a",
          }
        },
        {
          id: "el-cs-doc",
          type: "text",
          name: "CNPJ / Endereço",
          x: 16,
          y: 46,
          width: 340,
          height: 48,
          zIndex: 2,
          content: "CNPJ: {{cliente.cnpjCpf}}\nEndereço: {{cliente.endereco}} - {{cliente.cidade}}/{{cliente.estado}}",
          style: {
            fontSize: 11,
            textColor: "#475569",
          }
        },
        {
          id: "el-cs-seller-box",
          type: "shape",
          name: "Card Consultor",
          x: 440,
          y: 16,
          width: 260,
          height: 90,
          zIndex: 1,
          style: {
            backgroundColor: "#ffffff",
            borderColor: "#e2e8f0",
            borderWidth: 1,
            borderRadius: 6,
          }
        },
        {
          id: "el-cs-seller-title",
          type: "text",
          name: "Vendedor Responsável",
          x: 452,
          y: 24,
          width: 236,
          height: 20,
          zIndex: 2,
          content: "Consultor Técnico: {{vendedor.nome}}",
          style: {
            fontSize: 12,
            fontWeight: "bold",
            textColor: "#334155",
          }
        },
        {
          id: "el-cs-seller-contact",
          type: "text",
          name: "Contato do Vendedor",
          x: 452,
          y: 48,
          width: 236,
          height: 46,
          zIndex: 2,
          content: "E-mail: {{vendedor.email}}\nTelefone: {{vendedor.telefone}}",
          style: {
            fontSize: 11,
            textColor: "#64748b",
          }
        }
      ]
    }
  },
  {
    id: "lib-closing-signatures",
    name: "Painel de Fechamento com Aceite e Assinaturas",
    description: "Termo de aceitação, dois campos de assinatura e selo de conformidade digital",
    category: "financeiro",
    iconName: "FileCheck",
    isCustom: false,
    version: 1,
    createdAt: "2026-09-01T00:00:00Z",
    block: {
      id: "block-closing-signatures",
      type: "custom_block",
      title: "Aceite e Assinaturas",
      style: {
        width: "full",
        minHeight: 180,
        backgroundColor: "#ffffff",
        borderColor: "#e2e8f0",
        borderWidth: 1,
        borderRadius: 8,
        paddingTop: 16,
        paddingBottom: 16,
        paddingLeft: 16,
        paddingRight: 16,
      },
      elements: [
        {
          id: "el-cs-terms",
          type: "text",
          name: "Texto de Aceite",
          x: 20,
          y: 12,
          width: 680,
          height: 38,
          zIndex: 1,
          content: "Ao assinar este documento, o cliente declara concordar integralmente com as condições comerciais, prazos de entrega e valores discriminados na Proposta Comercial nº {{orcamento.numero}}.",
          style: {
            fontSize: 11,
            textColor: "#64748b",
            textAlign: "justify",
          }
        },
        {
          id: "el-cs-line1",
          type: "divider",
          name: "Linha Assinatura Cliente",
          x: 40,
          y: 100,
          width: 280,
          height: 1,
          zIndex: 1,
          style: {
            borderColor: "#94a3b8",
            borderWidth: 1,
          }
        },
        {
          id: "el-cs-label1",
          type: "text",
          name: "Legenda Cliente",
          x: 40,
          y: 108,
          width: 280,
          height: 36,
          zIndex: 2,
          content: "{{cliente.nome}}\nAssinatura do Responsável",
          style: {
            fontSize: 11,
            fontWeight: "medium",
            textColor: "#334155",
            textAlign: "center",
          }
        },
        {
          id: "el-cs-line2",
          type: "divider",
          name: "Linha Assinatura Empresa",
          x: 400,
          y: 100,
          width: 280,
          height: 1,
          zIndex: 1,
          style: {
            borderColor: "#94a3b8",
            borderWidth: 1,
          }
        },
        {
          id: "el-cs-label2",
          type: "text",
          name: "Legenda Empresa",
          x: 400,
          y: 108,
          width: 280,
          height: 36,
          zIndex: 2,
          content: "{{empresa.nome}}\nConsultor: {{vendedor.nome}}",
          style: {
            fontSize: 11,
            fontWeight: "medium",
            textColor: "#334155",
            textAlign: "center",
          }
        }
      ]
    }
  },
  {
    id: "lib-summary-floating",
    name: "Quadro de Totais com Destaque Flutuante",
    description: "Painel moderno de valores com destaque em gradiente para o total final",
    category: "financeiro",
    iconName: "Calculator",
    isCustom: false,
    version: 1,
    createdAt: "2026-09-01T00:00:00Z",
    block: {
      id: "block-summary-floating",
      type: "custom_block",
      title: "Resumo de Valores",
      style: {
        width: "full",
        minHeight: 140,
        backgroundColor: "#f8fafc",
        borderColor: "#e2e8f0",
        borderWidth: 1,
        borderRadius: 8,
        paddingTop: 16,
        paddingBottom: 16,
        paddingLeft: 16,
        paddingRight: 16,
      },
      elements: [
        {
          id: "el-sf-subtotal",
          type: "text",
          name: "Subtotal Produtos",
          x: 24,
          y: 20,
          width: 240,
          height: 24,
          zIndex: 1,
          content: "Subtotal Produtos: {{orcamento.totais.subtotal}}",
          style: {
            fontSize: 13,
            textColor: "#475569",
          }
        },
        {
          id: "el-sf-discount",
          type: "text",
          name: "Desconto Comercial",
          x: 24,
          y: 50,
          width: 240,
          height: 24,
          zIndex: 1,
          content: "Descontos Aplicados: -{{orcamento.totais.desconto}}",
          style: {
            fontSize: 13,
            textColor: "#16a34a",
            fontWeight: "medium",
          }
        },
        {
          id: "el-sf-freight",
          type: "text",
          name: "Frete e Impostos",
          x: 24,
          y: 80,
          width: 240,
          height: 24,
          zIndex: 1,
          content: "Frete: {{orcamento.totais.frete}} • Impostos: {{orcamento.totais.impostos}}",
          style: {
            fontSize: 11,
            textColor: "#64748b",
          }
        },
        {
          id: "el-sf-total-box",
          type: "shape",
          name: "Caixa Destaque Total",
          x: 360,
          y: 18,
          width: 320,
          height: 96,
          zIndex: 1,
          style: {
            backgroundColor: "#4f46e5",
            borderRadius: 8,
            boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
          }
        },
        {
          id: "el-sf-total-label",
          type: "text",
          name: "Label Total Líquido",
          x: 380,
          y: 28,
          width: 280,
          height: 20,
          zIndex: 2,
          content: "VALOR TOTAL DA PROPOSTA",
          style: {
            fontSize: 11,
            fontWeight: "bold",
            textColor: "#c7d2fe",
            textAlign: "center",
          }
        },
        {
          id: "el-sf-total-value",
          type: "heading",
          name: "Valor Total Grande",
          x: 380,
          y: 50,
          width: 280,
          height: 42,
          zIndex: 2,
          content: "{{orcamento.totais.total}}",
          variableTag: "{{orcamento.totais.total}}",
          style: {
            fontSize: 26,
            fontWeight: "bold",
            textColor: "#ffffff",
            textAlign: "center",
          }
        }
      ]
    }
  }
];

// Sanear blocos do usuário eliminando nomes duplicados e vazios na biblioteca
export function sanitizeUserBlocks(userBlocks: ReusableBlockTemplate[]): { sanitized: ReusableBlockTemplate[], changed: boolean } {
  let changed = false;
  const seenNames = new Set<string>();

  // Adicionar nomes dos blocos padrão para evitar colisões
  DEFAULT_REUSABLE_BLOCKS.forEach(b => {
    seenNames.add(b.name.trim().toLowerCase());
  });

  const sanitized = userBlocks.map(block => {
    let currentName = block.name ? block.name.trim() : "";
    if (!currentName) {
      currentName = (block.block && block.block.title) ? block.block.title.trim() : "Bloco Sem Nome";
    }

    const lowercaseName = currentName.toLowerCase();
    if (!seenNames.has(lowercaseName)) {
      seenNames.add(lowercaseName);
      if (block.name !== currentName || (block.block && block.block.title !== currentName)) {
        changed = true;
        return {
          ...block,
          name: currentName,
          block: block.block ? { ...block.block, title: currentName } : block.block
        };
      }
      return block;
    }

    // Nome duplicado encontrado! Gerar um nome exclusivo sequencial
    let counter = 1;
    let candidate = `${currentName} (Cópia)`;
    while (seenNames.has(candidate.toLowerCase())) {
      counter++;
      candidate = `${currentName} (Cópia ${counter})`;
    }

    seenNames.add(candidate.toLowerCase());
    changed = true;
    return {
      ...block,
      name: candidate,
      block: block.block ? { ...block.block, title: candidate } : block.block
    };
  });

  return { sanitized, changed };
}

// Carregar biblioteca mesclando os blocos padrão com os customizados do localStorage
export function getReusableBlocksLibrary(): ReusableBlockTemplate[] {
  if (typeof localStorage === "undefined") {
    return [...DEFAULT_REUSABLE_BLOCKS];
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [...DEFAULT_REUSABLE_BLOCKS];
    const userBlocks: ReusableBlockTemplate[] = JSON.parse(raw);
    if (!Array.isArray(userBlocks)) return [...DEFAULT_REUSABLE_BLOCKS];

    const { sanitized, changed } = sanitizeUserBlocks(userBlocks);
    if (changed) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
      if (typeof window !== "undefined") {
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent("block-library-updated", { detail: { action: "sanitize" } }));
        }, 0);
      }
    }

    // Mesclar: primeiro os personalizados pelo usuário, depois os padrão
    return [...sanitized, ...DEFAULT_REUSABLE_BLOCKS];
  } catch (err) {
    console.warn("Erro ao ler biblioteca de blocos:", err);
    return [...DEFAULT_REUSABLE_BLOCKS];
  }
}

// Pilha de Histórico para Undo/Redo da Biblioteca Reutilizável
const libraryUndoStack: ReusableBlockTemplate[][] = [];
let libraryRedoStack: ReusableBlockTemplate[][] = [];

// Registrar snapshot antes de alterações na biblioteca
function pushLibraryHistoryState() {
  if (typeof localStorage === "undefined") return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const userBlocks: ReusableBlockTemplate[] = raw ? JSON.parse(raw) : [];
    libraryUndoStack.push(JSON.parse(JSON.stringify(userBlocks)));
    if (libraryUndoStack.length > 30) {
      libraryUndoStack.shift();
    }
    libraryRedoStack = [];
  } catch (err) {
    console.warn("Erro ao gravar histórico da biblioteca:", err);
  }
}

export function canUndoLibraryAction(): boolean {
  return libraryUndoStack.length > 0;
}

export function canRedoLibraryAction(): boolean {
  return libraryRedoStack.length > 0;
}

export function undoLibraryAction(): boolean {
  if (libraryUndoStack.length === 0 || typeof localStorage === "undefined") return false;
  try {
    const currentRaw = localStorage.getItem(STORAGE_KEY);
    const currentBlocks: ReusableBlockTemplate[] = currentRaw ? JSON.parse(currentRaw) : [];
    libraryRedoStack.push(currentBlocks);

    const previousBlocks = libraryUndoStack.pop();
    if (previousBlocks) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(previousBlocks));
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("block-library-updated", { detail: { action: "undo" } }));
      }
      return true;
    }
    return false;
  } catch (err) {
    console.warn("Erro ao desfazer na biblioteca:", err);
    return false;
  }
}

export function redoLibraryAction(): boolean {
  if (libraryRedoStack.length === 0 || typeof localStorage === "undefined") return false;
  try {
    const currentRaw = localStorage.getItem(STORAGE_KEY);
    const currentBlocks: ReusableBlockTemplate[] = currentRaw ? JSON.parse(currentRaw) : [];
    libraryUndoStack.push(currentBlocks);

    const nextBlocks = libraryRedoStack.pop();
    if (nextBlocks) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextBlocks));
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("block-library-updated", { detail: { action: "redo" } }));
      }
      return true;
    }
    return false;
  } catch (err) {
    console.warn("Erro ao refazer na biblioteca:", err);
    return false;
  }
}

// Auxiliar para verificar nomes repetidos na biblioteca de blocos
export function isBlockNameDuplicate(name: string, excludeTemplateId?: string): boolean {
  const clean = name.trim().toLowerCase();
  if (!clean) return false;
  const library = getReusableBlocksLibrary();
  return library.some(
    b => b.name.toLowerCase().trim() === clean && b.id !== excludeTemplateId
  );
}

// Obter um nome de bloco garantidamente exclusivo na biblioteca de blocos
export function getUniqueBlockName(baseName: string, excludeTemplateId?: string): string {
  const cleanBase = baseName.trim();
  if (!isBlockNameDuplicate(cleanBase, excludeTemplateId)) {
    return cleanBase;
  }

  let counter = 1;
  let candidate = `${cleanBase} (Cópia)`;
  while (isBlockNameDuplicate(candidate, excludeTemplateId)) {
    counter++;
    candidate = `${cleanBase} (Cópia ${counter})`;
  }
  return candidate;
}

// Salvar um bloco atual como modelo reutilizável na biblioteca
export function saveBlockToLibrary(
  block: DocumentBlock,
  metadata: {
    name: string;
    description: string;
    category: "comercial" | "financeiro" | "conteudo" | "layout" | "personalizado";
  }
): ReusableBlockTemplate {
  pushLibraryHistoryState();
  const currentLibrary = getReusableBlocksLibrary();
  const userSavedOnly = currentLibrary.filter(b => b.isCustom);

  const cleanName = metadata.name.trim() || block.title || "Bloco Personalizado";

  // Criar clone profundo dos elementos para isolamento completo
  const clonedElements: BlockInternalElement[] = (block.elements || []).map((el, index) => ({
    ...el,
    id: `lib-el-${Date.now().toString(36)}-${index}`,
    style: el.style ? { ...el.style } : undefined,
    config: el.config ? { ...el.config } : undefined,
  }));

  // Verificar se o bloco já existe na biblioteca (por libraryBlockId ou id de template)
  const existingIndex = userSavedOnly.findIndex(
    b => (block.libraryBlockId && (b.id === block.libraryBlockId || b.block.libraryBlockId === block.libraryBlockId)) ||
         (block.id && (b.id === block.id || b.block.id === block.id))
  );

  const existingTemplateId = existingIndex >= 0 ? userSavedOnly[existingIndex].id : undefined;

  if (isBlockNameDuplicate(cleanName, existingTemplateId)) {
    throw new Error(`O nome "${cleanName}" já está em uso na biblioteca de blocos. Escolha um nome exclusivo.`);
  }

  let resultTemplate: ReusableBlockTemplate;

  if (existingIndex >= 0) {
    const existing = userSavedOnly[existingIndex];
    resultTemplate = {
      ...existing,
      name: cleanName,
      description: metadata.description.trim() || existing.description,
      category: metadata.category || existing.category,
      updatedAt: new Date().toISOString(),
      block: {
        ...existing.block,
        ...block,
        id: `block-${existing.id}`,
        title: cleanName,
        libraryBlockId: existing.id,
        elements: clonedElements,
        style: block.style ? { ...block.style } : existing.block.style,
        config: block.config ? { ...block.config } : existing.block.config,
      }
    };
    userSavedOnly[existingIndex] = resultTemplate;
  } else {
    const templateId = `custom-lib-${Date.now().toString(36)}`;
    resultTemplate = {
      id: templateId,
      name: cleanName,
      description: metadata.description.trim() || "Bloco composto personalizado reutilizável",
      category: metadata.category || "personalizado",
      isCustom: true,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      block: {
        ...block,
        id: `block-${templateId}`,
        title: cleanName,
        isReusable: true,
        libraryBlockId: templateId,
        elements: clonedElements,
        style: block.style ? { ...block.style } : undefined,
        config: block.config ? { ...block.config } : undefined,
      }
    };
    userSavedOnly.unshift(resultTemplate);
  }

  if (typeof localStorage !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userSavedOnly));
    window.dispatchEvent(new CustomEvent("block-library-updated", { detail: { action: "save", template: resultTemplate } }));
  }

  return resultTemplate;
}

// Renomear ou atualizar um bloco na biblioteca pelo ID do template ou do bloco
export function updateBlockNameInLibrary(
  idOrLibraryId: string,
  newName: string
): boolean {
  if (typeof localStorage === "undefined" || !idOrLibraryId || !newName.trim()) return false;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const userBlocks: ReusableBlockTemplate[] = raw ? JSON.parse(raw) : [];
    
    let updated = false;
    const cleanName = newName.trim();

    // Encontrar o template atual para pegar seu ID real e evitar falso positivo de duplicidade
    const targetTemplate = userBlocks.find(tpl => 
      tpl.id === idOrLibraryId ||
      tpl.block.id === idOrLibraryId ||
      tpl.block.libraryBlockId === idOrLibraryId
    );

    const targetTemplateId = targetTemplate ? targetTemplate.id : undefined;

    if (isBlockNameDuplicate(cleanName, targetTemplateId)) {
      throw new Error(`O nome "${cleanName}" já está em uso na biblioteca de blocos.`);
    }

    pushLibraryHistoryState();

    const newBlocks = userBlocks.map(tpl => {
      if (
        tpl.id === idOrLibraryId ||
        tpl.block.id === idOrLibraryId ||
        tpl.block.libraryBlockId === idOrLibraryId
      ) {
        updated = true;
        return {
          ...tpl,
          name: cleanName,
          updatedAt: new Date().toISOString(),
          block: {
            ...tpl.block,
            title: cleanName,
          }
        };
      }
      return tpl;
    });

    if (updated) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newBlocks));
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("block-library-updated", { detail: { action: "rename" } }));
      }
      return true;
    }
    return false;
  } catch (err) {
    console.warn("Erro ao renomear bloco na biblioteca:", err);
    return false;
  }
}

// Excluir um bloco personalizado da biblioteca (retorna o template excluído para undo/toast)
export function deleteBlockFromLibrary(id: string): ReusableBlockTemplate | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const userBlocks: ReusableBlockTemplate[] = JSON.parse(raw);
    const target = userBlocks.find(b => b.id === id);
    if (!target) return null;

    pushLibraryHistoryState();

    const filtered = userBlocks.filter(b => b.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("block-library-updated", { detail: { action: "delete", template: target } }));
    }
    return target;
  } catch {
    return null;
  }
}

// Duplicar um bloco dentro da biblioteca
export function duplicateBlockInLibrary(id: string, newName?: string): ReusableBlockTemplate | null {
  const all = getReusableBlocksLibrary();
  const target = all.find(b => b.id === id);
  if (!target) return null;

  let finalName = "";
  if (newName) {
    if (isBlockNameDuplicate(newName)) {
      throw new Error(`O nome "${newName}" já está em uso na biblioteca de blocos.`);
    }
    finalName = newName;
  } else {
    finalName = getUniqueBlockName(`${target.name} (Cópia)`);
  }

  return saveBlockToLibrary(target.block, {
    name: finalName,
    description: target.description,
    category: target.category,
  });
}

// Instanciar um bloco da biblioteca para o layout com IDs completamente novos e isolamento total
export function instantiateBlockFromLibrary(template: ReusableBlockTemplate): DocumentBlock {
  const uniqueSuffix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const newBlockId = `block-inst-${uniqueSuffix}`;

  const clonedElements: BlockInternalElement[] = (template.block.elements || []).map((el, idx) => ({
    ...el,
    id: `el-inst-${uniqueSuffix}-${idx}`,
    style: el.style ? { ...el.style } : undefined,
    config: el.config ? { ...el.config } : undefined,
  }));

  return {
    ...template.block,
    id: newBlockId,
    title: template.name,
    libraryBlockId: template.id,
    isReusable: true,
    elements: clonedElements,
    style: template.block.style ? { ...template.block.style } : { width: "full", minHeight: 140 },
    config: template.block.config ? { ...template.block.config } : {},
  };
}

// Conversão de bloco existente para bloco composto com elementos internos editáveis preservando todo o conteúdo e variáveis
export function createComposedBlockFromExistingBlock(block: DocumentBlock): DocumentBlock {
  if (block.elements !== undefined || block.isComposed) {
    return {
      ...block,
      isComposed: true,
      elements: (block.elements || []).map(el => ({
        ...el,
        style: el.style ? { ...el.style } : {},
        config: el.config ? { ...el.config } : {},
        buttonConfig: el.buttonConfig ? { ...el.buttonConfig } : undefined,
      })),
    };
  }

  const generatedElements: BlockInternalElement[] = [];
  let calculatedHeight = 160;

  switch (block.type) {
    case "header": {
      calculatedHeight = 150;
      generatedElements.push({
        id: `el-hdr-logo-${Date.now().toString(36)}`,
        type: "image",
        name: "Logotipo / Identidade",
        x: 20,
        y: 20,
        width: 140,
        height: 50,
        zIndex: 1,
        config: { url: "" },
      });
      generatedElements.push({
        id: `el-hdr-comp-${Date.now().toString(36)}`,
        type: "heading",
        name: "Razão Social Empresa",
        x: 175,
        y: 20,
        width: 320,
        height: 28,
        zIndex: 2,
        content: "{{empresa.razaoSocial}}",
        style: {
          fontSize: 16,
          fontWeight: "bold",
          textColor: block.style?.textColor || "#0f172a",
        }
      });
      generatedElements.push({
        id: `el-hdr-sub-${Date.now().toString(36)}`,
        type: "text",
        name: "Subtítulo / CNPJ Empresa",
        x: 175,
        y: 50,
        width: 320,
        height: 22,
        zIndex: 2,
        content: "CNPJ: {{empresa.cnpj}} • {{empresa.email}}",
        style: {
          fontSize: 11,
          textColor: "#64748b",
        }
      });
      generatedElements.push({
        id: `el-hdr-title-${Date.now().toString(36)}`,
        type: "heading",
        name: "Título do Documento",
        x: 505,
        y: 18,
        width: 255,
        height: 28,
        zIndex: 2,
        content: block.title || "PROPOSTA COMERCIAL",
        style: {
          fontSize: 17,
          fontWeight: "bold",
          textColor: block.style?.textColor || "#1e293b",
          textAlign: "right",
        }
      });
      generatedElements.push({
        id: `el-hdr-badge-${Date.now().toString(36)}`,
        type: "badge",
        name: "Badge Número Orçamento",
        x: 580,
        y: 50,
        width: 180,
        height: 26,
        zIndex: 3,
        content: "Nº {{orcamento.numero}}",
        style: {
          fontSize: 12,
          fontWeight: "bold",
          backgroundColor: "#e0e7ff",
          textColor: "#3730a3",
          borderRadius: 4,
          textAlign: "center",
        }
      });
      generatedElements.push({
        id: `el-hdr-dates-${Date.now().toString(36)}`,
        type: "text",
        name: "Datas de Emissão e Validade",
        x: 505,
        y: 82,
        width: 255,
        height: 20,
        zIndex: 2,
        content: "Emissão: {{orcamento.dataEmissao}} • Validade: {{orcamento.dataValidade}}",
        style: {
          fontSize: 10,
          textColor: "#64748b",
          textAlign: "right",
        }
      });
      generatedElements.push({
        id: `el-hdr-div-${Date.now().toString(36)}`,
        type: "divider",
        name: "Linha Divisória Cabeçalho",
        x: 20,
        y: 114,
        width: 740,
        height: 2,
        zIndex: 1,
        style: {
          borderColor: "#cbd5e1",
          borderWidth: 1,
        }
      });
      break;
    }

    case "client_info": {
      calculatedHeight = 220;
      generatedElements.push({
        id: `el-cli-hdr1-${Date.now().toString(36)}`,
        type: "heading",
        name: "Título Seção Cliente",
        x: 20,
        y: 16,
        width: 350,
        height: 28,
        zIndex: 1,
        content: block.title || "Dados do Cliente & Faturamento",
        style: {
          fontSize: 14,
          fontWeight: "bold",
          textColor: "#1e293b",
        }
      });
      generatedElements.push({
        id: `el-cli-name-${Date.now().toString(36)}`,
        type: "text",
        name: "Razão Social Cliente",
        x: 20,
        y: 52,
        width: 350,
        height: 26,
        zIndex: 2,
        content: "Razão Social: {{cliente.razaoSocial}}",
        style: {
          fontSize: 12,
          fontWeight: "600",
          textColor: "#0f172a",
        }
      });
      generatedElements.push({
        id: `el-cli-doc-${Date.now().toString(36)}`,
        type: "text",
        name: "CNPJ/CPF Cliente",
        x: 20,
        y: 84,
        width: 350,
        height: 26,
        zIndex: 2,
        content: "CNPJ/CPF: {{cliente.cnpjCpf}}",
        style: {
          fontSize: 12,
          textColor: "#334155",
        }
      });
      generatedElements.push({
        id: `el-cli-addr-${Date.now().toString(36)}`,
        type: "text",
        name: "Endereço Completo",
        x: 20,
        y: 116,
        width: 350,
        height: 36,
        zIndex: 2,
        content: "Endereço: {{cliente.endereco}} - {{cliente.cidade}}/{{cliente.estado}}",
        style: {
          fontSize: 11,
          textColor: "#334155",
        }
      });
      generatedElements.push({
        id: `el-cli-contact-${Date.now().toString(36)}`,
        type: "text",
        name: "Contato & Telefone",
        x: 20,
        y: 158,
        width: 350,
        height: 26,
        zIndex: 2,
        content: "Contato: {{cliente.telefone}} • {{cliente.email}}",
        style: {
          fontSize: 11,
          textColor: "#334155",
        }
      });

      // Coluna da direita (Consultor Comercial & Condições)
      generatedElements.push({
        id: `el-cli-hdr2-${Date.now().toString(36)}`,
        type: "heading",
        name: "Título Atendimento Comercial",
        x: 390,
        y: 16,
        width: 350,
        height: 28,
        zIndex: 1,
        content: "Atendimento & Condições",
        style: {
          fontSize: 14,
          fontWeight: "bold",
          textColor: "#1e293b",
        }
      });
      generatedElements.push({
        id: `el-cli-rep-${Date.now().toString(36)}`,
        type: "text",
        name: "Consultor Técnico",
        x: 390,
        y: 52,
        width: 350,
        height: 26,
        zIndex: 2,
        content: "Consultor: {{vendedor.nome}}",
        style: {
          fontSize: 12,
          fontWeight: "600",
          textColor: "#0f172a",
        }
      });
      generatedElements.push({
        id: `el-cli-repcont-${Date.now().toString(36)}`,
        type: "text",
        name: "Contato do Consultor",
        x: 390,
        y: 84,
        width: 350,
        height: 26,
        zIndex: 2,
        content: "E-mail: {{vendedor.email}} • Tel: {{vendedor.telefone}}",
        style: {
          fontSize: 11,
          textColor: "#334155",
        }
      });
      generatedElements.push({
        id: `el-cli-pay-${Date.now().toString(36)}`,
        type: "text",
        name: "Condições de Pagamento",
        x: 390,
        y: 116,
        width: 350,
        height: 26,
        zIndex: 2,
        content: "Pagamento: {{orcamento.condicoes.pagamento}}",
        style: {
          fontSize: 11,
          textColor: "#334155",
        }
      });
      generatedElements.push({
        id: `el-cli-deliv-${Date.now().toString(36)}`,
        type: "text",
        name: "Prazo de Entrega",
        x: 390,
        y: 158,
        width: 350,
        height: 26,
        zIndex: 2,
        content: "Prazo de Entrega: {{orcamento.condicoes.prazoEntrega}}",
        style: {
          fontSize: 11,
          textColor: "#334155",
        }
      });
      break;
    }

    case "totals_summary": {
      calculatedHeight = 190;
      generatedElements.push({
        id: `el-tot-bg-${Date.now().toString(36)}`,
        type: "shape",
        name: "Card de Totais (Fundo)",
        x: 400,
        y: 16,
        width: 360,
        height: 156,
        zIndex: 1,
        style: {
          backgroundColor: "#f8fafc",
          borderColor: "#e2e8f0",
          borderWidth: 1,
          borderRadius: 8,
        }
      });
      generatedElements.push({
        id: `el-tot-title-${Date.now().toString(36)}`,
        type: "heading",
        name: "Título Resumo Financeiro",
        x: 416,
        y: 28,
        width: 328,
        height: 24,
        zIndex: 2,
        content: block.title || "Resumo Financeiro da Proposta",
        style: {
          fontSize: 13,
          fontWeight: "bold",
          textColor: "#1e293b",
        }
      });
      generatedElements.push({
        id: `el-tot-sub-${Date.now().toString(36)}`,
        type: "text",
        name: "Subtotal dos Produtos",
        x: 416,
        y: 54,
        width: 328,
        height: 20,
        zIndex: 2,
        content: "Subtotal dos Produtos: {{orcamento.totais.subtotal}}",
        style: {
          fontSize: 12,
          textColor: "#475569",
        }
      });
      generatedElements.push({
        id: `el-tot-desc-${Date.now().toString(36)}`,
        type: "text",
        name: "Desconto Concedido",
        x: 416,
        y: 74,
        width: 328,
        height: 20,
        zIndex: 2,
        content: "Descontos Aplicados: - {{orcamento.totais.desconto}}",
        style: {
          fontSize: 12,
          fontWeight: "600",
          textColor: "#dc2626",
        }
      });
      generatedElements.push({
        id: `el-tot-freight-${Date.now().toString(36)}`,
        type: "text",
        name: "Frete e Impostos",
        x: 416,
        y: 94,
        width: 328,
        height: 20,
        zIndex: 2,
        content: "Frete / Impostos: {{orcamento.totais.frete}}",
        style: {
          fontSize: 11,
          textColor: "#475569",
        }
      });
      generatedElements.push({
        id: `el-tot-total-${Date.now().toString(36)}`,
        type: "badge",
        name: "Valor Total Destacado",
        x: 416,
        y: 120,
        width: 328,
        height: 38,
        zIndex: 3,
        content: "VALOR TOTAL: {{orcamento.totais.total}}",
        style: {
          fontSize: 15,
          fontWeight: "bold",
          backgroundColor: "#dcfce7",
          textColor: "#15803d",
          borderRadius: 6,
          textAlign: "center",
        }
      });
      break;
    }

    case "button": {
      calculatedHeight = 90;
      generatedElements.push({
        id: `el-btn-${Date.now().toString(36)}`,
        type: "button",
        name: "Botão de Ação Interativo",
        x: 240,
        y: 20,
        width: 300,
        height: 44,
        zIndex: 1,
        content: block.content || "Aprovar Proposta Comercial",
        buttonConfig: block.buttonConfig || {
          actionType: block.config?.url ? "link" : "approve_quote",
          url: block.config?.url,
          openInNewTab: true,
        },
        style: {
          backgroundColor: block.style?.backgroundColor || "#4f46e5",
          textColor: block.style?.textColor || "#ffffff",
          borderRadius: 8,
          fontSize: 14,
          fontWeight: "bold",
          textAlign: "center",
        }
      });
      break;
    }

    case "signatures": {
      calculatedHeight = 180;
      generatedElements.push({
        id: `el-sig-terms-${Date.now().toString(36)}`,
        type: "text",
        name: "Termo de Aceite Formal",
        x: 20,
        y: 16,
        width: 740,
        height: 36,
        zIndex: 1,
        content: block.config?.termsText || "Ao aprovar esta proposta comercial, o cliente declara estar ciente e de acordo com todas as condições de faturamento, prazos e produtos discriminados neste documento.",
        style: {
          fontSize: 11,
          textColor: "#64748b",
        }
      });
      generatedElements.push({
        id: `el-sig-line1-${Date.now().toString(36)}`,
        type: "divider",
        name: "Linha Assinatura Cliente",
        x: 40,
        y: 95,
        width: 300,
        height: 1,
        zIndex: 1,
        style: { borderColor: "#64748b" }
      });
      generatedElements.push({
        id: `el-sig-lbl1-${Date.now().toString(36)}`,
        type: "text",
        name: "Rótulo Assinatura Cliente",
        x: 40,
        y: 104,
        width: 300,
        height: 36,
        zIndex: 2,
        content: "{{cliente.nome}}\nCNPJ/CPF: {{cliente.cnpjCpf}}\nAceite do Cliente / Responsável",
        style: {
          fontSize: 11,
          textAlign: "center",
          textColor: "#334155",
        }
      });
      generatedElements.push({
        id: `el-sig-line2-${Date.now().toString(36)}`,
        type: "divider",
        name: "Linha Assinatura Consultor",
        x: 440,
        y: 95,
        width: 300,
        height: 1,
        zIndex: 1,
        style: { borderColor: "#64748b" }
      });
      generatedElements.push({
        id: `el-sig-lbl2-${Date.now().toString(36)}`,
        type: "text",
        name: "Rótulo Assinatura Consultor",
        x: 440,
        y: 104,
        width: 300,
        height: 36,
        zIndex: 2,
        content: "{{vendedor.nome}}\nConsultor Técnico Comercial\n{{empresa.razaoSocial}}",
        style: {
          fontSize: 11,
          textAlign: "center",
          textColor: "#334155",
        }
      });
      break;
    }

    case "pix_payment": {
      calculatedHeight = 150;
      generatedElements.push({
        id: `el-pix-card-${Date.now().toString(36)}`,
        type: "shape",
        name: "Fundo Card PIX",
        x: 20,
        y: 16,
        width: 740,
        height: 116,
        zIndex: 1,
        style: {
          backgroundColor: "rgba(16, 185, 129, 0.05)",
          borderColor: "rgba(16, 185, 129, 0.25)",
          borderWidth: 1,
          borderRadius: 8,
        }
      });
      generatedElements.push({
        id: `el-pix-qr-${Date.now().toString(36)}`,
        type: "qr_code",
        name: "QR Code PIX",
        x: 36,
        y: 28,
        width: 90,
        height: 90,
        zIndex: 2,
        content: "00020126580014br.gov.bcb.pix...",
      });
      generatedElements.push({
        id: `el-pix-title-${Date.now().toString(36)}`,
        type: "heading",
        name: "Título PIX",
        x: 145,
        y: 28,
        width: 400,
        height: 24,
        zIndex: 2,
        content: "Pagamento Instantâneo via PIX",
        style: {
          fontSize: 14,
          fontWeight: "bold",
          textColor: "#065f46",
        }
      });
      generatedElements.push({
        id: `el-pix-key-${Date.now().toString(36)}`,
        type: "variable",
        name: "Chave PIX",
        x: 145,
        y: 54,
        width: 400,
        height: 22,
        zIndex: 2,
        variableTag: "{{empresa.cnpj}}",
        content: `Chave PIX (${block.config?.pixKeyType || "CNPJ"}): ${block.config?.pixKey || "{{empresa.cnpj}}"}`,
        style: {
          fontSize: 12,
          fontWeight: "600",
          textColor: "#047857",
        }
      });
      generatedElements.push({
        id: `el-pix-fav-${Date.now().toString(36)}`,
        type: "text",
        name: "Favorecido PIX",
        x: 145,
        y: 78,
        width: 400,
        height: 20,
        zIndex: 2,
        content: `Favorecido: ${block.config?.pixBeneficiaryName || "{{empresa.razaoSocial}}"}`,
        style: {
          fontSize: 11,
          textColor: "#334155",
        }
      });
      generatedElements.push({
        id: `el-pix-btn-${Date.now().toString(36)}`,
        type: "button",
        name: "Botão Copiar Chave PIX",
        x: 575,
        y: 52,
        width: 170,
        height: 38,
        zIndex: 3,
        content: "Copiar Chave PIX",
        buttonConfig: {
          actionType: "copy_pix",
          pixKey: block.config?.pixKey || "{{empresa.cnpj}}",
        },
        style: {
          backgroundColor: "#10b981",
          textColor: "#ffffff",
          borderRadius: 6,
          fontSize: 12,
          fontWeight: "bold",
          textAlign: "center",
        }
      });
      break;
    }

    case "commercial_terms":
    case "notes":
    case "bank_details":
    case "terms": {
      calculatedHeight = 140;
      generatedElements.push({
        id: `el-txt-title-${Date.now().toString(36)}`,
        type: "heading",
        name: "Título da Seção",
        x: 20,
        y: 16,
        width: 600,
        height: 26,
        zIndex: 1,
        content: block.title || (block.type === "commercial_terms" ? "Garantia & Condições Comerciais" : block.type === "bank_details" ? "Dados Bancários" : "Observações Gerais"),
        style: {
          fontSize: 14,
          fontWeight: "bold",
          textColor: "#1e293b",
        }
      });
      generatedElements.push({
        id: `el-txt-body-${Date.now().toString(36)}`,
        type: "text",
        name: "Texto / Variáveis",
        x: 20,
        y: 48,
        width: 740,
        height: 70,
        zIndex: 1,
        content: block.content || block.config?.commercialText || block.config?.warrantyText || block.config?.bankDetailsText || "{{orcamento.observacoes}}",
        style: {
          fontSize: 12,
          textColor: block.style?.textColor || "#334155",
        }
      });
      break;
    }

    case "products_table":
    case "products_grid":
    case "pricing_table": {
      calculatedHeight = 120;
      generatedElements.push({
        id: `el-prod-title-${Date.now().toString(36)}`,
        type: "heading",
        name: "Título da Tabela",
        x: 20,
        y: 16,
        width: 600,
        height: 26,
        zIndex: 1,
        content: block.title || "Tabela de Produtos & Serviços",
        style: {
          fontSize: 15,
          fontWeight: "bold",
          textColor: "#1e293b",
        }
      });
      generatedElements.push({
        id: `el-prod-desc-${Date.now().toString(36)}`,
        type: "text",
        name: "Descrição Tabela ERP",
        x: 20,
        y: 48,
        width: 740,
        height: 40,
        zIndex: 1,
        content: "Itens, quantidades, valores unitários, NCM, alíquotas e subtotais preenchidos automaticamente com os itens da proposta comercial.",
        style: {
          fontSize: 11,
          textColor: "#64748b",
        }
      });
      break;
    }

    default: {
      // Blocos genéricos: text, heading, card, custom_html, etc.
      let currentY = 16;
      if (block.title) {
        generatedElements.push({
          id: `elem-head-${Date.now().toString(36)}`,
          type: "heading",
          name: "Título Principal",
          x: 20,
          y: currentY,
          width: 500,
          height: 30,
          zIndex: 1,
          content: block.title,
          style: {
            fontSize: block.style?.fontSize ? parseInt(block.style.fontSize) : 16,
            fontWeight: "bold",
            textColor: block.style?.textColor || "#0f172a",
            textAlign: block.style?.textAlign || "left",
          }
        });
        currentY += 38;
      }

      if (block.content || (!block.title && !block.variableTag)) {
        generatedElements.push({
          id: `elem-txt-${Date.now().toString(36)}`,
          type: "text",
          name: "Texto / Conteúdo com Tags",
          x: 20,
          y: currentY,
          width: 740,
          height: 60,
          zIndex: 1,
          content: block.content || "Digite o conteúdo ou insira tags como {{cliente.nome}}",
          style: {
            fontSize: 13,
            textColor: block.style?.textColor || "#334155",
            textAlign: block.style?.textAlign || "left",
          }
        });
        currentY += 70;
      }

      if (block.variableTag) {
        generatedElements.push({
          id: `elem-var-${Date.now().toString(36)}`,
          type: "variable",
          name: `Tag: ${block.variableTag}`,
          x: 20,
          y: currentY,
          width: 320,
          height: 30,
          zIndex: 2,
          variableTag: block.variableTag,
          content: block.variableTag,
          style: {
            fontSize: 13,
            fontWeight: "600",
            textColor: "#4f46e5",
          }
        });
        currentY += 40;
      }
      calculatedHeight = Math.max(120, currentY + 16);
      break;
    }
  }

  return {
    ...block,
    isComposed: true,
    type: "custom_block",
    style: {
      ...block.style,
      minHeight: Math.max(block.style?.minHeight || 0, calculatedHeight),
      backgroundColor: block.style?.backgroundColor || "#ffffff",
    },
    elements: generatedElements,
  };
}

// Agrupar elementos selecionados em um novo bloco composto
export function groupElementsIntoBlock(
  elements: BlockInternalElement[],
  blockTitle: string = "Bloco Agrupado"
): DocumentBlock {
  if (elements.length === 0) {
    return {
      id: `block-grp-${Date.now().toString(36)}`,
      type: "custom_block",
      title: blockTitle,
      style: { width: "full", minHeight: 120, backgroundColor: "#ffffff" },
      elements: [],
    };
  }

  // Calcular caixa envolvente (bounding box) dos elementos selecionados
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  elements.forEach(el => {
    if (el.x < minX) minX = el.x;
    if (el.y < minY) minY = el.y;
    const right = el.x + el.width;
    const bottom = el.y + el.height;
    if (right > maxX) maxX = right;
    if (bottom > maxY) maxY = bottom;
  });

  const width = Math.max(100, Math.round(maxX - minX + 32));
  const height = Math.max(80, Math.round(maxY - minY + 32));

  // Normalizar posições dos elementos com margem interna de 16px
  const normalizedElements: BlockInternalElement[] = elements.map((el, idx) => ({
    ...el,
    id: `grp-el-${Date.now().toString(36)}-${idx}`,
    x: Math.round(el.x - minX + 16),
    y: Math.round(el.y - minY + 16),
    style: el.style ? { ...el.style } : undefined,
    config: el.config ? { ...el.config } : undefined,
  }));

  return {
    id: `block-grp-${Date.now().toString(36)}`,
    type: "custom_block",
    title: blockTitle,
    style: {
      width: "full",
      minHeight: height,
      backgroundColor: "#ffffff",
      borderColor: "#e2e8f0",
      borderWidth: 1,
      borderRadius: 8,
      paddingTop: 16,
      paddingBottom: 16,
      paddingLeft: 16,
      paddingRight: 16,
    },
    elements: normalizedElements,
  };
}

// Aliases para manter compatibilidade com nomes de funções
export const saveBlockAsReusableTemplate = saveBlockToLibrary;
export const deleteReusableBlockTemplate = deleteBlockFromLibrary;
export const duplicateReusableBlockTemplate = duplicateBlockInLibrary;

