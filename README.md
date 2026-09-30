# Financial Management System

<p align="center">
  <strong>Full-stack finance and receivables management prototype with modular APIs, statement imports, reporting and bank-transaction processing.</strong>
</p>

<p align="center">
  <a href="https://github.com/eyildirim82/Finansal-Y-netim-Sistemi/actions/workflows/verify.yml"><img src="https://github.com/eyildirim82/Finansal-Y-netim-Sistemi/actions/workflows/verify.yml/badge.svg" alt="Verify" /></a>
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black" alt="React 18" />
  <img src="https://img.shields.io/badge/TypeScript-backend-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Prisma-5-2D3748?logo=prisma" alt="Prisma 5" />
  <img src="https://img.shields.io/badge/PostgreSQL-15-4169E1?logo=postgresql&logoColor=white" alt="PostgreSQL 15" />
  <img src="https://img.shields.io/badge/status-active%20prototype-orange" alt="Active prototype" />
</p>

A full-stack financial management project that explores day-to-day business finance workflows beyond simple income/expense CRUD: customer accounts, imported account statements, invoice aging, collections reporting, cash-flow views, bank notification parsing and payment matching.

The repository is best understood as an **active engineering prototype**, not a production-ready accounting product. Its strongest portfolio value is the breadth of business workflows, the modular backend structure and the process of hardening a larger application through validation, authentication, database migrations and automated verification.

## What the project demonstrates

| Area | What is implemented / represented in the codebase |
| --- | --- |
| **Modular backend** | Separate Express modules for auth, transactions, customers, categories, imports, reports, extracts, banking and cash workflows |
| **Financial workflows** | Income/expense records, customer accounts, statement transactions, balances, paid/unpaid invoice views and collections reporting |
| **Reporting** | Dashboard summaries, monthly/daily trends, category/customer reports, cash flow, aging, collections and invoice-oriented reporting routes |
| **Import pipeline** | Authenticated Excel/CSV/customer imports with file-type and size validation |
| **Banking experiments** | Authenticated email/PDF transaction processing, unmatched-payment workflows and payment matching |
| **Frontend** | React application with dashboard, customers, transactions, reports, extracts, banking, cash and import screens |
| **API hardening** | Helmet, CORS, compression, rate limiting, CUID-aware validation, centralized error handling and router-level banking authentication |
| **Database lifecycle** | Prisma schema, PostgreSQL migration baseline and an explicit Compose migration service before application startup |
| **Verification** | GitHub Actions provisions clean PostgreSQL 15, deploys migrations, builds/tests the backend, smoke-starts the API, then lints/builds the frontend |

## Current project status

PostgreSQL 15 is now the canonical database runtime across the Prisma schema, committed migration baseline, Docker Compose and CI verification.

The remaining pre-production concerns are more focused:

- several financial amount fields are still represented as Prisma `Float`; these should be migrated to exact decimal storage before treating the system as accounting-grade software;
- banking/email integration depends on external configuration and provider-specific notification formats, so it should still be considered experimental despite its authenticated API boundary;
- some debug-oriented surfaces and broader integration scenarios still need cleanup and coverage before deployment should be treated as mature.

For portfolio purposes, this repository is an example of **business-domain modeling, full-stack feature development and iterative hardening**, rather than a finished finance platform.

## Architecture

```text
React 18 + Vite
       │
       ▼
REST API
Express + TypeScript
       │
       ├── auth
       ├── transactions
       ├── customers
       ├── categories
       ├── imports / extracts
       ├── reports
       ├── banking
       └── cash
       │
       ▼
Prisma ORM
       │
       ▼
PostgreSQL 15
```

The Docker Compose stack also includes Redis, Nginx and monitoring services. A dedicated migration container runs `prisma migrate deploy` against a healthy PostgreSQL service, and the backend waits for that migration step to complete successfully before starting.

## Domain model

The Prisma schema models more than simple transactions. Core entities include:

- **User** — authentication, role and ownership
- **Customer** — account identity, payment pattern, due days and tags
- **Transaction** — income/expense records linked to categories and customers
- **Category** — hierarchical financial categories
- **Balance** — customer debit/credit/net-balance summary
- **Extract / ExtractTransaction** — imported statement files and their rows
- **BankTransaction** — parsed bank activity and match state
- **PaymentMatch** — automatic/manual customer-payment matching metadata
- **CashFlow** — opening/closing balance and income/expense totals
- **ReportCache** — cached report payloads
- **AuditLog** — audit-oriented change metadata

The schema also contains a separate `PDFTransaction` representation for bank-statement parsing experiments.

## Main workflows

### Authentication

The backend exposes public login/registration and protected profile/password-change flows.

```text
POST /api/auth/login
POST /api/auth/register
GET  /api/auth/profile
PUT  /api/auth/change-password
```

JWT middleware resolves the authenticated user from the database and role-aware middleware is available for privileged operations.

### Transactions

Transaction routes support authenticated CRUD, statistics, filtering and pagination. Route and relation IDs are validated against the CUID shape used by the Prisma schema.

```text
GET    /api/transactions
GET    /api/transactions/stats
GET    /api/transactions/:id
POST   /api/transactions
PUT    /api/transactions/:id
DELETE /api/transactions/:id
```

An admin-only bulk-delete route also exists.

### Customers

Customer routes are protected at router level and include list/statistics/search/overdue views plus CRUD operations.

```text
GET    /api/customers
GET    /api/customers/stats
GET    /api/customers/search
GET    /api/customers/overdue
POST   /api/customers
GET    /api/customers/:id
PUT    /api/customers/:id
DELETE /api/customers/:id
```

### Imports

The import module accepts Excel and CSV uploads, limits files to 10 MB and validates supported extensions.

```text
POST /api/imports/excel
POST /api/imports/csv
POST /api/imports/customers
GET  /api/imports/template
```

### Reporting

The reporting module is one of the broader parts of the project. Routes include:

- dashboard summary
- monthly and daily trends
- category and customer reports
- customer payment performance
- cash-flow reporting
- collections
- aging analysis
- paid/unpaid invoice views
- overdue-by-days analysis

Representative endpoints:

```text
GET /api/reports/dashboard
GET /api/reports/monthly-trend
GET /api/reports/category
GET /api/reports/customer
GET /api/reports/cash-flow
GET /api/reports/collections
GET /api/reports/aging
GET /api/reports/unpaid-invoices
GET /api/reports/paid-invoices
```

### Banking and payment matching

The banking area explores importing financial activity from email notifications and PDFs, detecting unmatched transactions and matching payments to customer accounts.

The repository includes:

- IMAP/email-processing dependencies
- bank transaction and payment-match models
- PDF upload/parsing routes
- unmatched-payment and matching-statistics routes
- automatic/manual matching actions
- a dedicated banking UI

Banking routes are protected at router level by the shared authentication middleware. The former unauthenticated test ETL route has been removed from the production router, and the frontend banking service has been aligned with the backend route contract.

The external bank-email integration itself remains experimental because it depends on provider-specific notification formats and runtime mailbox configuration.

## Security and API middleware

The main Express application configures:

- `helmet`
- CORS with a configured frontend origin
- response compression
- a global IP-based rate limit
- JSON body-size limits
- centralized error handling
- JWT middleware for protected modules
- role-aware middleware for privileged actions
- CUID-aware `express-validator` rules on identifier-based routes

Sensitive authorization headers and token fragments are not written to authentication logs.

## Verification and CI

GitHub Actions provides a repository-level verification gate for pull requests and pushes to `main`.

### Backend

CI provisions a clean PostgreSQL 15 service and verifies the committed migration baseline before exercising the application:

```bash
cd backend
npm ci
npx prisma generate
npx prisma migrate deploy
npm run build
npm test
```

After build/tests pass, the workflow starts the compiled API and polls the real `/health` endpoint. This catches failures that only appear during application startup or database initialization.

The test runner discovers both JavaScript and TypeScript test files.

### Frontend

```bash
cd frontend
npm ci
npm run lint
npm run build
```

The checked-in ESLint baseline includes React Hooks correctness checks and is run before the production Vite build.

The workflow also validates the Docker Compose configuration so service dependency changes fail early.

## Frontend

The frontend uses:

- React 18
- Vite
- React Router
- React Query
- React Hook Form
- Tailwind CSS
- Axios
- Recharts
- date-fns
- Lucide icons
- react-hot-toast

Current page-level features include dashboard, transactions, customers/customer detail, categories, reports, paid/unpaid invoice views, statement extracts, imports, banking and cash management.

## Backend

The backend uses:

- Node.js 20 in CI/container builds
- Express 4
- TypeScript
- Prisma 5
- PostgreSQL 15
- JWT + bcryptjs
- express-validator
- Multer
- ExcelJS / xlsx / csv-parser
- IMAP and mail parsing libraries
- PDF parsing
- Pino logging

## Project structure

```text
├── .github/workflows/
│   └── verify.yml             # PostgreSQL migration + backend verification + frontend lint/build
├── backend/
│   ├── prisma/                 # PostgreSQL schema and migration baseline
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   ├── banking/
│   │   │   ├── cash/
│   │   │   ├── categories/
│   │   │   ├── customers/
│   │   │   ├── extracts/
│   │   │   ├── imports/
│   │   │   ├── reports/
│   │   │   └── transactions/
│   │   └── shared/
│   └── test/
├── frontend/
│   └── src/
│       ├── components/
│       ├── pages/
│       └── services/
├── BANKA_MODULU_README.md
├── MODULAR_ARCHITECTURE.md
└── docker-compose.yml
```

## Running locally

### Requirements

- Node.js 20+
- PostgreSQL 15+ for direct host development, or Docker Compose
- npm

Copy the repository-level environment template first:

```bash
cp .env.example .env
```

### Full Compose stack

```bash
docker compose up --build
```

Compose waits for PostgreSQL health, runs the committed Prisma migrations through the one-shot `migrate` service and starts the backend only after migration success.

### Backend directly on the host

Start PostgreSQL matching the `DATABASE_URL` in `.env`, then:

```bash
cd backend
npm install
npm run prisma:generate
npx prisma migrate deploy
npm run dev
```

### Frontend directly on the host

```bash
cd frontend
npm install
npm run dev
```

## Development priorities

The highest-value next steps for this repository are now:

1. migrate financial money fields from floating-point storage to exact decimal types;
2. remove or isolate remaining debug-only routes/screens before treating the app as deployable;
3. add deterministic demo data and portfolio screenshots;
4. expand integration coverage around imports, reporting and banking workflows;
5. continue dependency/security maintenance as the prototype matures.

## Why this repository is in the portfolio

This project is useful as a record of working through a broad business domain: customer ledgers, bank activity, file imports, invoice aging, collections and reporting. It complements smaller, more finished projects by showing how a larger application can be decomposed into domain modules and hardened iteratively.

It is intentionally presented with its remaining technical debt visible. The repository is a development project, not a claim of production accounting-software readiness.
