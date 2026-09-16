# Copilot Workspace Instructions

## Overview
This workspace contains a full-stack sales management solution with a React + Vite frontend and a Node.js/Express BFF (Backend for Frontend) server that proxies and augments a Protheus ERP REST API. The project is split into two main parts:
- **Frontend**: React (Vite, TypeScript, shadcn-ui, Tailwind CSS)
- **Backend**: Node.js/Express (TypeScript, stateless, no local DB)

## Build & Test Commands

### Frontend
- **Install dependencies:** `npm install`
- **Start dev server:** `npm run dev`
- **Build for production:** `npm run build`
- **Lint:** `npm run lint`
- **Unit tests:** `npm run test` or `npm run test:watch`
- **E2E tests:** `npm run test:e2e`

### Backend (server/)
- **Install dependencies:** `cd server && npm install`
- **Start dev server:** `npm run dev:server` (from root) or `npm run dev` (from server/)
- **Build:** `cd server && npm run build`
- **Type check:** `cd server && npm run typecheck`
- **Start production:** `cd server && npm start`
- **Docker build:** `cd server && docker build -t vendasprotheus-bff .`
- **Docker run:** `cd server && docker run -d --name vendasprotheus-bff -p 3001:3001 --env-file .env vendasprotheus-bff`

## Key Architecture & Conventions
- **Stateless BFF**: All business logic and persistence are handled by Protheus; the backend is a proxy with value-added services (email, WhatsApp).
- **No local DB**: Do not add a database to the backend.
- **API Key**: All /messaging endpoints require `X-Api-Key` header.
- **Environment**: Use `.env.example` as a template for required variables in both root and server/.
- **Frontend/Backend separation**: Keep React and Express code isolated; communicate only via HTTP API.
- **Testing**: Use Vitest for unit tests, Playwright for E2E (see e2e/ folder).
- **Type safety**: Use TypeScript everywhere; validate all API inputs with Zod (backend).
- **Security**: Use Helmet, CORS, rate limiting, and input validation as shown in server/README.md.

## Potential Pitfalls
- **API credentials**: Ensure `.env` is configured with valid Protheus and SMTP credentials.
- **Port conflicts**: Frontend runs on 8080, backend on 3001 by default.
- **Statelessness**: Do not persist data in the backend; all state is in Protheus.
- **E2E tests**: Require backend and frontend running, and may depend on mock or real API settings.

## Example Prompts
- "How do I run all tests?"
- "How do I add a new API endpoint to the BFF?"
- "How do I connect the frontend to a different backend URL?"
- "How do I deploy with Docker?"

## See Also
- [README.md](../README.md) for general project info
- [server/README.md](../server/README.md) for backend details

---
_This file was generated to help AI agents and developers quickly understand and work productively in this workspace._
