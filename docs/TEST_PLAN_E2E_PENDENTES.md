# Plano Mestre de Testes E2E Pendentes - Projeto Vendas Protheus

## Status Atual (2026-09-09)
- ✅ Testes Unitários (Vitest): **146/146 passing**
- ✅ Navegação Básica TopNavbar (Playwright): **17/17 passing**
- ✅ Auth Básico (Login/2FA/Logout): **8/8 passing**

---

## FASE 1 - CRÍTICO (Erro/Auth + CRUD Core) - Prioridade ALTA

### 1.1 Testes de Erro e Credenciais Inválidas (`e2e/auth-error.spec.ts`)
| Cenário | Descrição | Status |
|---------|-----------|--------|
| Login com senha incorreta | Validar mensagem de erro amigável | 🔴 Pendente |
| Bloqueio após 5 tentativas (Rate Limiting) | Verificar lockout temporário | 🔴 Pendente |
| Tentativa de acesso a rota protegida sem auth | Redirecionamento para `/login` | 🔴 Pendente |
| Sessão expirada durante navegação | Refresh automático ou logout gracioso | 🔴 Pendente |
| 2FA com código inválido/expirado | Tratamento de erro específico | 🔴 Pendente |

### 1.2 Fluxos CRUD Core (`e2e/crud-core.spec.ts`)
| Módulo | Operações | Status |
|--------|-----------|--------|
| **Orçamentos** | Criar → Editar → Clonar → Enviar Omnichannel → Aprovar/Recusar → Converter em Pedido | 🔴 Pendente |
| **Pedidos** | Criar do zero → Aprovar (alçada >10%) → Faturar → Cancelar | 🔴 Pendente |
| **Clientes** | Novo Lead → Qualificar → Converter em Cliente → Editar limite crédito | 🔴 Pendente |
| **Produtos** | Novo Produto → Upload Imagens (Galeria/Webcam) → Variações → Estoque Baixo | 🔴 Pendente |
| **Produção** | Criar Lote → Avançar Estágios (Mistura→Prensagem→Queima→CQ→Embalagem) → OEE | 🔴 Pendente |

---

## FASE 2 - IMPORTANTE (Governance + RBAC + Offline) - Prioridade MÉDIA

### 2.1 Governance Studio & Flow Studio (`e2e/governance-flow.spec.ts`)
| Cenário | Descrição |
|---------|-----------|
| Criar Regra Comercial | Expressão estruturada + Ação + Prioridade |
| Versionar Regra | `promoteRule` / `nextRuleVersion` |
| Simular Comissão | Input valor/margem → Output trace auditável |
| Flow Studio - Desenhar Fluxo | Nós/Arestas + Validação DAG (ciclos/órfãos) |
| Auto-correção 1 clique | Remover nós inalcançáveis / Quebrar ciclos |

### 2.2 RBAC Granular por Perfil (`e2e/rbac-perfil.spec.ts`)
| Perfil | Módulos Visíveis | Ações Permitidas | Isolamento Dados |
|--------|------------------|------------------|------------------|
| **Admin** | Todos (17) | CRUD Total | Global |
| **Diretor Comercial** | Dashboard, Clientes, Orçamentos, Pedidos, Aprovações, Relatórios, Financeiro | Aprovar >10%, Ver tudo | Organização |
| **Gerente Vendas** | Dashboard, Clientes, Orçamentos, Pedidos, Aprovações, Produção | Aprovar até 10%, Gerenciar equipe | Equipe |
| **Representante** | Meu Ambiente (5 módulos filtrados) | Própria carteira apenas | `minha_carteira` |
| **Financeiro** | Dashboard, Financeiro, Relatórios, Auditoria | Contas a Receber/Pagar, Conciliação | Financeiro |
| **Produção** | Dashboard, Produção, Relatórios | Avançar lotes, OEE | Produção |

### 2.3 Resiliência Offline & Sync (`e2e/offline-sync.spec.ts`)
| Cenário | Validação |
|---------|-----------|
| Desconectar rede → Criar/Editar offline | Persiste no `localStorage` / `IndexedDB` |
| Reconectar → Sync automático | `SupabaseSyncManager` resolve conflitos |
| Conflito de versão (otimista) | Merge ou prompt de resolução |
| Eventos `local-db-change` / `approvalsChanged` | UI atualiza em tempo real multi-aba |

---

## FASE 3 - AVANÇADO (Export/Performance/a11y/Segurança) - Prioridade BAIXA/MÉDIA

### 3.1 Exportação & Relatórios (`e2e/export-reports.spec.ts`)
- Geração Excel (Relatórios Gerenciais, Financeiro, Produção)
- Geração PDF (Orçamentos, Propostas, Etiquetas)
- Impressão direta (Ctrl+P) com layout corporativo

### 3.2 Performance Frontend (`e2e/performance.spec.ts`)
- LCP < 2.5s no Dashboard (dados reais)
- FID < 100ms em interações críticas
- Memory leak test: 50 navegações Dashboard↔Produção sem crescimento
- Bundle size analysis (code splitting por rota)

### 3.3 Acessibilidade WCAG 2.1 AA (`e2e/a11y.spec.ts`)
- Navegação 100% teclado (Tab/Enter/Esc/Setas)
- ARIA labels em todos os modais, dropdowns, tabelas
- Contraste 4.5:1 (texto) / 3:1 (UI)
- Leitura NVDA/JAWS: headers, landmarks, live regions

### 3.4 Segurança (`e2e/security.spec.ts`)
- XSS em busca, formulários, comentários
- IDOR manipulando IDs na URL (`/orcamentos/999`)
- Tokens não vazam em localStorage/console (produção)
- CSP headers válidos

### 3.5 Contrato API (`e2e/api-contract.spec.ts`)
- Validação Zod/OpenAPI em todas rotas `/api/v1/*`
- Retrocompatibilidade v1 → v2
- Rate limiting headers (`X-RateLimit-*`)

### 3.6 Visual Regression (`e2e/visual.spec.ts`)
- Screenshots baseline: Dashboard, Orçamento, Produção, Financeiro
- Comparação pixel-a-pixel (threshold 0.1%)
- Responsividade: 375px, 768px, 1440px, 1920px

### 3.7 Remotion Video (`e2e/remotion.spec.ts`)
- Render vídeo produto (30s, 1080p)
- Assets (imagens, fontes) carregam corretamente
- Duração exata + metadados JSON

---

## Estratégia de Execução

### Semana 1 (Fase 1)
```
Dia 1-2: auth-error.spec.ts (5 cenários)
Dia 3-5: crud-core.spec.ts (5 módulos × 4-6 ops = ~25 testes)
```

### Semana 2 (Fase 2)
```
Dia 1-2: governance-flow.spec.ts
Dia 3: rbac-perfil.spec.ts (6 perfis × validação)
Dia 4: offline-sync.spec.ts (simulação network)
```

### Semana 3 (Fase 3 - Parcial)
```
Dia 1: export-reports.spec.ts
Dia 2: performance.spec.ts (métricas core)
Dia 3: a11y.spec.ts (axe-playwright)
Dia 4: security.spec.ts (básico)
```

---

## Dependências Técnicas

| Recurso | Necessário Para |
|---------|-----------------|
| `@axe-core/playwright` | Testes a11y |
| `pixelmatch` + `pngjs` | Visual regression |
| `lighthouse` / `web-vitals` | Performance |
| Credenciais Supabase reais | Offline sync, RBAC real |
| Usuários de teste por perfil | RBAC (precisa seed no Supabase) |

---

## Critérios de Aceite por Fase

| Fase | Critério | Target |
|------|----------|--------|
| 1 | 0 falhas críticas auth/CRUD | 100% pass |
| 2 | RBAC valida isolamento por org/rep | 100% pass |
| 3 | LCP < 2.5s, 0 violações a11y AA | Métricas atingidas |

---

## Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Dados de teste instáveis (mock vs real) | Alta | Médio | Fixtures isoladas + cleanup automático |
| Flakiness Playwright (timing) | Média | Alto | `waitForLoadState`, `expect.poll`, retries |
| RBAC requer seed complexo no Supabase | Alta | Alto | Mock `useAuth` + `hasPermission` nos testes |
| Visual regression frágil | Média | Baixo | Thresholds tolerantes + atualização manual baseline |

---

## Próximos Passos Imediatos

1. [ ] Criar `e2e/auth-error.spec.ts` com 5 cenários
2. [ ] Criar `e2e/crud-orcamentos.spec.ts` (maior ROI)
3. [ ] Configurar `axe-playwright` para a11y
4. [ ] Preparar fixtures de usuários por perfil