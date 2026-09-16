// ─── Knowledge Base for Enterprise AI Assistant ───
// Estrutura para armazenar conhecimento empresarial gerenciável pela empresa.
// A IA consulta esta base antes de tomar decisões críticas.

import type { AppUser, UserRole } from "./types-roles";

export type KnowledgeSource = "document" | "faq" | "policy" | "procedure" | "regulation" | "internal";

export type KnowledgeCategory = 
  | "comercial"
  | "financeiro"
  | "atendimento"
  | "cobranca"
  | "credito"
  | "erp"
  | "seguranca"
  | "operacional";

export interface KnowledgeDocument {
  id: string;
  title: string;
  category: KnowledgeCategory;
  content: string;
  source: KnowledgeSource;
  tags: string[];
  author?: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  isActive: boolean;
}

export interface FaqEntry {
  id: string;
  question: string;
  answer: string;
  category: KnowledgeCategory;
  tags: string[];
  isActive: boolean;
}

export interface PolicyRule {
  id: string;
  name: string;
  category: KnowledgeCategory;
  condition: string;
  action: string;
  priority: number;
  isActive: boolean;
  metadata?: Record<string, any>;
}

export interface KnowledgeBase {
  documents: KnowledgeDocument[];
  faqs: FaqEntry[];
  policies: PolicyRule[];

  // Buscar documentos
  searchDocuments(
    query: string, 
    category?: KnowledgeCategory, 
    tags?: string[],
    limit?: number
  ): Promise<KnowledgeDocument[]>;

  // Buscar FAQ
  getFaq(question: string): Promise<FaqEntry | null>;

  // Buscar regra de política
  getPolicy(ruleId: string): Promise<PolicyRule | null>;

  // Inserir/atualizar documento
  upsertDocument(doc: Omit<KnowledgeDocument, "id" | "createdAt" | "updatedAt">): Promise<KnowledgeDocument>;

  // Excluir documento
  deleteDocument(id: string): Promise<boolean>;

  // Atualizar política
  updatePolicy(rule: PolicyRule): Promise<PolicyRule>;
}

// Mock implementation - será substituído por implementação real com Supabase
export class KnowledgeBaseImpl implements KnowledgeBase {
  private documents: KnowledgeDocument[] = [];
  private faqs: FaqEntry[] = [];
  private policies: PolicyRule[] = [];

  async searchDocuments(
    query: string, 
    category?: KnowledgeCategory, 
    tags?: string[],
    limit = 10
  ): Promise<KnowledgeDocument[]> {
    const results = this.documents
      .filter(d => d.isActive)
      .filter(d => category ? d.category === category : true)
      .filter(d => tags ? tags.some(t => d.tags.includes(t)) : true)
      .filter(d => d.content.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => b.version - a.version);
    
    return results.slice(0, limit);
  }

  async getFaq(question: string): Promise<FaqEntry | null> {
    const normalizedQuestion = question.toLowerCase().trim();
    const result = this.faqs.find(f => 
      f.isActive && (f.question.toLowerCase().includes(normalizedQuestion) || f.answer.toLowerCase().includes(normalizedQuestion))
    );
    return result || null;
  }

  async getPolicy(ruleId: string): Promise<PolicyRule | null> {
    return this.policies.find(p => p.id === ruleId && p.isActive) || null;
  }

  async upsertDocument(doc: Omit<KnowledgeDocument, "id" | "createdAt" | "updatedAt">): Promise<KnowledgeDocument> {
    const id = doc.id || `doc-${Date.now()}`;
    const now = new Date().toISOString();
    const document: KnowledgeDocument = {
      id,
      title: doc.title,
      category: doc.category,
      content: doc.content,
      source: doc.source,
      tags: doc.tags,
      author: doc.author,
      createdAt: now,
      updatedAt: now,
      version: doc.version || 1,
      isActive: doc.isActive !== undefined ? doc.isActive : true,
    };
    
    // Verificar se já existe
    const existingIdx = this.documents.findIndex(d => d.id === id);
    if (existingIdx >= 0) {
      this.documents[existingIdx] = document;
    } else {
      this.documents.push(document);
    }
    
    return document;
  }

  async deleteDocument(id: string): Promise<boolean> {
    const idx = this.documents.findIndex(d => d.id === id);
    if (idx >= 0) {
      this.documents[idx].isActive = false;
      return true;
    }
    return false;
  }

  async updatePolicy(rule: PolicyRule): Promise<PolicyRule> {
    const idx = this.policies.findIndex(p => p.id === rule.id);
    if (idx >= 0) {
      this.policies[idx] = rule;
      return rule;
    }
    this.policies.push(rule);
    return rule;
  }
}

// Singleton instance
export const knowledgeBase: KnowledgeBase = new KnowledgeBaseImpl();

// Export types for use in AI prompts
export type { KnowledgeSource, KnowledgeCategory, KnowledgeDocument, FaqEntry, PolicyRule };