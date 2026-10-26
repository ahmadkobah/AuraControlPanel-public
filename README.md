# Aura Control Panel

Central administration dashboard for the Aura document platform. Superadmins use it to manage
companies, users, subscription tiers, the AI processing pipeline, prompts, search, billing and
security for the Aura backend and the AI service, from one web interface and without
restarting services.

---

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [How It Works](#how-it-works)
4. [Subscription Tiers](#subscription-tiers)
5. [Technology Stack](#technology-stack)
6. [Project Structure](#project-structure)
7. [Getting Started](#getting-started)
8. [Configuration](#configuration)
9. [API Reference](#api-reference)
10. [Data Model](#data-model)
11. [Security](#security)
12. [Logging](#logging)
13. [Known Issues](#known-issues)
14. [License](#license)

---

## Overview

### Purpose

The Aura platform has several parts: the Aura backend (users, companies, documents), the AI
service (OCR, classification, extraction, search) and a shared MongoDB database. Each part has
its own settings. Without a central tool, an administrator would have to edit configuration
files, change database records by hand and restart services to change how the platform behaves.

The Control Panel gives one place to do this work:

- manage customer companies, their departments and users,
- assign each company a subscription tier (Basic, Plus or Pro) with its own limits and AI features,
- turn AI pipeline steps on or off and tune their parameters,
- manage document classifications, AI prompts, search settings and automatic filing rules,
- create, send and track invoices,
- monitor service health, hardware usage, API endpoints, tokens and logs.

Changes are saved in MongoDB and pushed to the AI service through its configuration and
synchronisation endpoints.

### Intended users

Platform operators with the **superadmin** role. Normal Aura users cannot sign in.

### Part of the Aura platform

| System | Role | Default port |
|--------|------|--------------|
| **Control Panel frontend (this repository)** | **Admin web interface** | **3000** |
| **Control Panel backend (this repository)** | **Admin REST API** | **4000** |
| Aura backend | Main application | 8000 |
| AI service (Basic tier) | Document AI | 9000 |
| AI service (Plus / Pro tier) | Document AI with more features | 9001 / 9002 |
| Llamafile | Local language model | 8080 |
| MongoDB | Shared database | 27017 |

---

## Features

| Area | Page | What it does |
|------|------|--------------|
| Overview | Dashboard | Service health, CPU, GPU and memory usage, tier deployment status |
| | Statistics | Usage figures per company and department |
| | Audit Logs | Record of every administrative change |
| Organisation | Companies | Create, edit, archive and restore companies; bulk tier changes; SMTP and branding settings; CSV export |
| | Departments | Manage departments per company |
| | Users | Manage Aura user accounts |
| AI management | Pipelines | Turn each AI pipeline step on or off and tune its parameters |
| | Classifications | Define document types and sync them to the AI service |
| | AI Prompts | Edit, test and version prompts; track metrics and feedback; sync to the AI service |
| | Auto-Filing Rules | Rules that file documents automatically by type and extracted data |
| | Search Control | Search modes, thresholds and ranking; sync to the AI service |
| System | Environment Config | View and edit `.env` settings of the Control Panel, Aura and the AI service |
| | Tier Management | Tier defaults, per-company tier settings and overrides |
| | Printers | Printer configuration and assignment |
| | API Catalog Manager | Catalogue of all platform API endpoints with health checks and tier URLs |
| | Token Management | Active sessions and API keys; revoke or generate keys |
| | Security Center | Security status, settings and connection tests |
| | System Logs | Read and stream service logs |
| Billing | Billing and Payments | Invoices, payments, reminders and revenue figures |

---

## How It Works

```
   Browser (superadmin)
          |
          v
   +-----------------------+     JWT (Bearer)     +---------------------------+
   | Control Panel UI      |--------------------->| Control Panel API         |
   | React + Vite, :3000   |                      | Node.js + Express, :4000  |
   +-----------------------+                      +---+-----------+-----------+
                                                      |           |
                         +----------------------------+           +-----------------+
                         | read / write                            | REST            |
                         v                                         v                 v
                  +-------------+                    +----------------+   +------------------+
                  |  MongoDB    |<-------------------|  Aura backend  |   |  AI service      |
                  |  (shared)   |                    |  :8000         |   |  :9000-9002      |
                  +-------------+                    +----------------+   +------------------+
```

1. A superadmin signs in with the same e-mail and password used in Aura. The backend checks
   the password against the shared `users` collection and accepts only the `superadmin` role.
2. The backend returns a JWT valid for 7 days and revokes older sessions of the same user.
3. The frontend sends the token with every request.
4. Control Panel data (tiers, prompts, classifications, rules, invoices, logs) is stored in
   MongoDB.
5. Companies, departments and users are managed through a proxy to the Aura backend
   (`/proxy/...`).
6. AI settings are pushed to the AI service with the `sync-to-ai-service` actions and the
   AI configuration endpoints.

---

## Subscription Tiers

Default values from `backend/src/config/tierDefaults.js`. You can override each value per company.

| | Basic | Plus | Pro |
|--|-------|------|-----|
| Documents | 1,000 | 10,000 | Unlimited |
| Storage | 10 GB | 100 GB | Unlimited |
| Users | 10 | 50 | Unlimited |
| Entity extraction | No | Yes | Yes |
| AI service port | 9000 | 9001 | 9002 |

All tiers include OCR, semantic and conversational search, classification, structured
extraction, summaries, Q&A, scanner support and batch processing. Each tier also has its own
set of AI pipeline flags and model parameters.

---

## Technology Stack

| Part | Technology | Purpose |
|------|------------|---------|
| Backend | Node.js 20+, Express 4 (ES modules) | REST API |
| | Mongoose 8 | MongoDB models |
| | jsonwebtoken, bcrypt | Sign-in and tokens |
| | axios | Calls to the Aura backend and the AI service |
| | Winston, Morgan | Logging |
| | cors | Browser access control |
| Frontend | React 18, React Router 7 | User interface |
| | Vite 5 | Development server and build |
| Database | MongoDB (shared with Aura) | Data storage |

---

## Project Structure

```
AuraControlPanel/
|-- main.js                     Starts backend and frontend together
|-- backend/
|   |-- src/
|   |   |-- server.js           Express app, sign-in, auth middleware, route mounting
|   |   |-- config/             API catalogue and tier defaults
|   |   |-- controllers/        AI configuration and auto-filing logic
|   |   |-- middleware/         Tier limit checks
|   |   |-- models/             Mongoose models
|   |   |-- routes/
|   |   |   |-- admin/          Admin API (configs, tiers, prompts, billing, ...)
|   |   |   `-- *.js            Proxy, logs, AI config, auto-filing, discovery
|   |   `-- utils/              Logger
|   `-- .env.example
`-- frontend/
    |-- src/
    |   |-- pages/              One file per page (Dashboard, Companies, Pipelines, ...)
    |   |-- components/         Shared components
    |   |-- contexts/           Sign-in state
    |   `-- lib/api.js          API client
    |-- vite.config.js
    `-- .env.example
```

---

## Getting Started

### Prerequisites

- Node.js 20.6 or later (the backend uses `node --env-file`)
- Access to the MongoDB database used by Aura
- The Aura backend and the AI service, for the features that call them
- A user with the `superadmin` role in the Aura `users` collection

### 1. Clone and install

```bash
git clone https://github.com/ahmadkobah/AuraControlPanel-public.git
cd AuraControlPanel-public
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
```

### 2. Configure

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Set `MONGO_URI` and `ADMIN_JWT_SECRET` in `backend/.env`. `ADMIN_JWT_SECRET` must be the same
secret the Aura backend uses for its tokens.

### 3. Start

Both parts together:

```bash
npm start
```

Or separately:

```bash
cd backend && npm run dev     # http://localhost:4000
cd frontend && npm run dev    # http://localhost:3000
```

### 4. Sign in

Open `http://localhost:3000` and sign in with a superadmin account.

### Production build

```bash
cd frontend
npm run build                 # output in frontend/dist
```

---

## Configuration

### Backend (`backend/.env`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MONGO_URI` | Yes | | MongoDB connection string (`MONGO_URL` and `MONGODB_URI` also work) |
| `ADMIN_JWT_SECRET` | Yes | | Token secret, shared with the Aura backend (`JWT_SECRET` also works) |
| `PORT` | No | `4000` | Backend port |
| `AURA_BACKEND_URL` | No | `http://localhost:8000` | Aura backend address |
| `AI_SERVICE_URL` | No | `http://localhost:9000` | AI service address |
| `AI_SERVICE_API_KEY` | No | empty | API key sent to the AI service |
| `CORS_ORIGINS` | No | `http://localhost:3000` | Allowed browser origins, comma-separated |

### Frontend (`frontend/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_BASE` | `http://localhost:4000` | Control Panel backend address |

Never commit `.env` files. Use the `.env.example` files as templates.

---

## API Reference

`/health` and `/login` are public. All other endpoints need a superadmin token in the header
`Authorization: Bearer <token>`.

### Core

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| POST | `/login` | Sign in and receive a token |
| GET | `/admin/verify`, `/admin/whoami` | Check the token, current admin |
| GET | `/status/services` | Status of Aura, the AI service and the hardware |

### Administration (`/admin/...`)

| Path | Operations |
|------|------------|
| `/admin/configs` | List, create, read, update, delete, reload |
| `/admin/tiers` | Tier assignments, defaults, apply defaults, tier status |
| `/admin/tier-configs` | Tier and company configuration, compare, resolve, sync to the AI service |
| `/admin/classifications` | List, create, update, delete, sync to the AI service |
| `/admin/prompts` | List, create, update, delete, test, metrics, feedback, sync to the AI service |
| `/admin/search-configs` | List, create, update, delete, sync to the AI service |
| `/admin/pipelines` | List, create, update, delete |
| `/admin/printers` | List, create, update, delete |
| `/admin/api-catalog` | Seed, list, tier URLs, health checks, discover new endpoints |
| `/admin/api-endpoints` | List, create, update, delete |
| `/admin/tokens` | Active sessions, API keys, statistics, revoke, generate |
| `/admin/billing` | Invoices (create, send, remind, cancel, mark paid), payments, statistics |
| `/admin/security` | Status, settings, connection tests |
| `/admin/statistics` | Overall, per company, per department |
| `/admin/environment` | Read and update `.env` settings per service, restart trigger |
| `/admin/audit-logs` | List audit entries |
| `/admin/logs/:service` | Read, stream and clear service logs |
| `/admin/ai-service/config` | Read, update, reset and sync AI service settings |
| `/admin/ai-proxy` | AI service health and classification per tier |
| `/admin/auto-filing-rules` | Rules: create, update, delete, enable, test, statistics, duplicate, priorities |
| `/admin/discover-apis` | Discover API endpoints of connected services |

### Aura proxy (`/proxy/...`)

| Path | Operations |
|------|------------|
| `/proxy/companies` | List, read, create, update, delete |
| `/proxy/departments` | List, read, create, update, delete |
| `/proxy/users` | List, read, create, update, delete |

### Public

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/public/prompts/...` | Prompts for the AI service |

---

## Data Model

Collections in the shared MongoDB database:

| Model | Purpose |
|-------|---------|
| `users` (Aura) | Sign-in check for superadmins |
| `CompanyTier`, `CompanyTierConfig`, `TierHistory` | Tier assignments, per-company settings and change history |
| `ControlConfig` | General Control Panel settings |
| `AIClassification` | Document type definitions |
| `PromptConfig` | AI prompts with versions and metrics |
| `SearchConfig` | Search settings |
| `PipelineConfig` | AI pipeline configurations |
| `AutoFilingRule` | Automatic filing rules per company and department |
| `PrinterConfig` | Printer settings |
| `APIEndpoint` | API catalogue entries and health status |
| `Token` | Sessions and API keys (stored as hashes) |
| `Invoice` | Invoices and payments |
| `AuditLog` | Audit trail |

---

## Security

- **Superadmin only.** Sign-in and every protected request check for the `superadmin` role.
- **Passwords.** Checked with bcrypt against the hashes stored by Aura.
- **Tokens.** JWTs expire after 7 days. A new sign-in revokes older sessions, and each
  request updates the session's last activity.
- **CORS.** Only the origins in `CORS_ORIGINS` can call the API.
- **Audit trail.** Administrative changes are written to the audit log.
- **Secrets.** Keep `.env` files out of Git, and use a strong, unique `ADMIN_JWT_SECRET`.

---

## Logging

Backend logs are written to the console and to `backend/logs/`:

| File | Content | Rotation |
|------|---------|----------|
| `control-panel.log` | All entries | 10 MB, 5 files |
| `error.log` | Errors only | 10 MB, 5 files |
| `exceptions.log` | Uncaught exceptions | 10 MB, 3 files |

Logs can also be viewed in the System Logs page.

---

## Known Issues

- **Tier limits:** `tierLimitMiddleware.js` exists but is not yet applied to any route, so tier
  limits are not enforced by the API.
- **Environment backups:** `backend/src/routes/environmentRoutes.js` (backup and restore) is not
  mounted; only the `/admin/environment` routes are active.
- **Service restart:** the restart action is a placeholder and does not restart services.
- **Old files:** `*.stub.jsx` pages and `frontend/src/AuthContext.jsx` are unused.
- **Sign-in logging:** the sign-in handler writes debug messages, including the e-mail address,
  to the console.

---

## License

Private. All rights reserved.

Author: Ahmad Kobah
