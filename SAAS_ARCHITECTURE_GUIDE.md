# Recomendações Estruturais para SaaS em Produção (Docker, Nuvem, Supabase & Event Hub)

Este documento define a arquitetura em camadas conforme as **Diretrizes Arquiteturais de Tempo Real**, integrando a aplicação com o **Unified Event Hub** centralizado (`websocket_full`).

---

## 1. Distribuição de Responsabilidades ("Cada um em seu papel")

| Componente | Papel & Responsabilidade | Tecnologia / Camada |
| :--- | :--- | :--- |
| **Supabase (PostgreSQL + RLS + Auth)** | **Fonte da Verdade Persistente**: Armazenamento durável de dados relacionais multi-tenant, tabelas estruturadas (pedidos, clientes, regras de governança, fluxos, metas), autenticação JWT e isolamento rigoroso via Row Level Security (RLS). | Cloud Postgres / Self-Hosted Supabase |
| **Servidor Express (REST API / Event Producer)** | **Produtor de Eventos & ERP Bridge**: Endpoints determinísticos (`/api/v1/*`), cálculo de comissões, integração com ERP TOTVS Protheus, webhooks omnichannel e emissão de eventos via HTTP POST para o Event Hub. Não roda servidores WebSocket locais. | Node.js 22 LTS / Express |
| **Unified Event Hub (`websocket_full`)** | **Hub Centralizado de Mensageria em Tempo Real**: Barramento global de eventos WebSocket que recebe payloads HTTP POST dos backends e distribui para salas (`rooms`) e clientes conectados. | Event Hub Centralizado |
| **Frontend SPA (React + Vite)** | **Visualização Reativa e Ingestão de Eventos**: Interface reativa com ReactFlow, laboratório de simulações, kanban em tempo real e presença conectada diretamente ao Unified Event Hub. | React 18, Tailwind CSS, Lucide |
| **Docker & Orquestração** | **Empacotamento Seguro & Execução**: Imagem multi-stage otimizada com Alpine Linux, execução como usuário não-root (`nodejs`), gerenciador de processos `dumb-init` e healthchecks automáticos. | Dockerfile & Docker Compose |

---

## 2. Padrão de Disparo de Eventos do Backend (HTTP Event Producer)

Conforme a diretriz, o backend não abre nem gerencia conexões WebSocket persistentes; ele funciona exclusivamente como **produtor de eventos** via chamada HTTP POST:

- **Endpoint**: `POST ${EVENT_HUB_URL}` (`https://websocket-full.internal/events` ou `/api/jobs/trigger`)
- **Headers**:
  - `Authorization: Bearer <INGEST_AUTH_TOKEN>`
  - `x-tenant-id: <APP_ID_OU_TENANT_ID>`
  - `Content-Type: application/json`
- **Exemplo de Payload JSON enviado pelo Backend (`publishEvent`)**:
  ```json
  {
    "eventName": "producao.atualizada",
    "source": "backend-vendasprotheus",
    "tenantId": "vendasprotheus-saas",
    "rooms": ["producao", "lotes"],
    "payload": {
      "id": "LOT-2026-0101",
      "status": "Em Queima"
    },
    "critical": false
  }
  ```

---

## 3. Guia de Execução em Produção com Docker

### Executar a stack completa:
```bash
docker compose up -d --build
```

### Verificar o status dos containers e saúde do sistema:
```bash
docker compose ps
docker compose logs -f app
```

### Endpoint de Healthcheck:
```bash
curl -f http://localhost:3000/api/v1/health
```

