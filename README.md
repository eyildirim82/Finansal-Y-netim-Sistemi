# Financial Management System

<p align="center">
  <strong>Full-stack finance and receivables management prototype with modular APIs, statement imports, reporting and bank-transaction processing.</strong>
</p>

<p align="center">
  <a href="https://github.com/eyildirim82/Finansal-Y-netim-Sistemi/actions/workflows/verify.yml"><img src="https://github.com/eyildirim82/Finansal-Y-netim-Sistemi/actions/workflows/verify.yml/badge.svg" alt="Verify" /></a>
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black" alt="React 18" />
  <img src="https://img.shields.io/badge/TypeScript-backend-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Prisma-5-2D3748?logo=prisma" alt="Prisma 5" />
  <img src="https://img.shields.io/badge/status-active%20prototype-orange" alt="Active prototype" />
</p>

A full-stack financial management project that explores day-to-day business finance workflows beyond simple income/expense CRUD: customer accounts, imported account statements, invoice aging, collections reporting, cash-flow views, bank notification parsing and payment matching.

The repository is best understood as an **active engineering prototype**, not a production-ready accounting product. Its strongest portfolio value is the breadth of business workflows, the modular backend structure and the process of hardening a larger application through validation, authentication and automated verification.

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
| **Verification** | GitHub Actions runs backend TypeScript build/tests plus frontend ESLint and production build on pull requests and `main` |

## Current project status

The application has substantial feature code and an automated verification baseline. The main remaining repository-level inconsistency is the database target:

- the committed Prisma schema and migration lock currently use **SQLite**;
- `docker-compose.yml` defines a **PostgreSQL 15** deployment target, so the Compose database configuration and committed Prisma migrations are not yet aligned;
- several financial amount fields are still represented as Prisma `Float`, which is acceptable for a prototype but should be migrated to exact decimal storage before treating the system as accounting-grade software;
- banking/email integration depends on external configuration and should still be considered experimental despite its authenticated API boundary.

For portfolio purposes, this repository is therefore an example of **business-domain modeling, full-stack feature development and iterative hardening**, rather than a finished finance platform.

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
SQLite (current committed schema)
```

A broader Docker Compose stack is also present for a future/containerized deployment shape with PostgreSQL, Redis, Nginx and monitoring services. The database layer needs migration alignment before that stack should be treated as the canonical runtime.

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

```bash
cd backend
npm ci
npx prisma generate
npm run build
npm test
```

CI currently uses a temporary SQLite database URL because SQLite is still the committed Prisma provider. The test runner discovers both JavaScript and TypeScript test files.

### Frontend

```bash
cd frontend
npm ci
npm run lint
npm run build
```

The checked-in ESLint baseline includes React Hooks correctness checks and is run before the production Vite build.

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

- Node.js
- Express 4
- TypeScript
- Prisma 5
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
│   └── verify.yml             # Backend build/tests + frontend lint/build
├── backend/
│   ├── prisma/                 # Current SQLite schema and migrations
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

## Running the current development setup

The safest starting point is to run the backend and frontend separately against the database configuration expected by the committed Prisma schema.

### Backend

```bash
cd backend
npm install
cp ../.env.example .env
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Before using the Docker Compose stack, first align the Prisma datasource/migrations with the PostgreSQL configuration in `docker-compose.yml`.

## Development priorities

The highest-value next steps for this repository are now:

1. align Prisma schema/migrations and Docker Compose around one canonical PostgreSQL runtime;
2. migrate financial money fields from floating-point storage to exact decimal types;
3. remove or isolate remaining debug-only routes/screens before treating the app as deployable;
4. add deterministic demo data and portfolio screenshots after the database baseline is stable;
5. expand integration coverage around imports, reporting and banking workflows.

## Why this repository is in the portfolio

This project is useful as a record of working through a broad business domain: customer ledgers, bank activity, file imports, invoice aging, collections and reporting. It complements smaller, more finished projects by showing how a larger application can be decomposed into domain modules and hardened iteratively.

It is intentionally presented with its remaining technical debt visible. The repository is a development project, not a claim of production accounting-software readiness.
