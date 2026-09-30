# Financial Management System

<p align="center">
  <strong>Full-stack finance and receivables management prototype with modular APIs, statement imports, reporting and bank-transaction processing.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black" alt="React 18" />
  <img src="https://img.shields.io/badge/TypeScript-backend-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Prisma-5-2D3748?logo=prisma" alt="Prisma 5" />
  <img src="https://img.shields.io/badge/status-active%20prototype-orange" alt="Active prototype" />
</p>

A full-stack financial management project that explores day-to-day business finance workflows beyond simple income/expense CRUD: customer accounts, imported account statements, invoice aging, collections reporting, cash-flow views, bank notification parsing and payment matching.

The repository is best understood as an **active engineering prototype**, not a production-ready accounting product. Its strongest portfolio value is the breadth of business workflows and the modular backend structure; several integration and deployment boundaries still need consolidation before production use.

## What the project demonstrates

| Area | What is implemented / represented in the codebase |
| --- | --- |
| **Modular backend** | Separate Express modules for auth, transactions, customers, categories, imports, reports, extracts, banking and cash workflows |
| **Financial workflows** | Income/expense records, customer accounts, statement transactions, balances, paid/unpaid invoice views and collections reporting |
| **Reporting** | Dashboard summaries, monthly/daily trends, category/customer reports, cash flow, aging, collections and invoice-oriented reporting routes |
| **Import pipeline** | Authenticated Excel/CSV/customer imports with file-type and size validation |
| **Banking experiments** | Email/PDF transaction parsing, unmatched-payment workflows and payment-matching models |
| **Frontend** | React application with dashboard, customers, transactions, reports, extracts, banking, cash and import screens |
| **API hardening** | Helmet, CORS configuration, compression, global rate limiting, request validation and centralized error handling |
| **Authentication** | JWT-based protected routes, bcrypt password hashing and role-aware middleware |

## Current project status

The application has substantial feature code, but a few repository-level inconsistencies are intentionally documented here instead of hidden:

- the committed Prisma schema and migration lock currently use **SQLite**;
- `docker-compose.yml` defines a **PostgreSQL 15** deployment target, so the Compose database configuration and committed Prisma migrations are not yet aligned;
- some older route validation code still assumes numeric IDs even though current Prisma entities use `cuid()` string IDs;
- the banking module mixes authenticated and unauthenticated routes and should receive an authorization pass before any production deployment;
- automated tests exist for selected backend utilities/behaviors, but the repository does not yet have a complete CI verification pipeline.

For portfolio purposes, this repository should therefore be read as an example of **business-domain modeling and full-stack feature development in progress**, rather than a finished finance platform.

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

A broader Docker Compose stack is also present for a future/containerized deployment shape with PostgreSQL, Redis, Nginx and monitoring services. The database layer needs migration alignment before that stack should be treated as production-ready.

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

### Transactions

Transaction routes support authenticated CRUD, statistics, filtering and pagination. Validation covers transaction type, amount, dates and query bounds.

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

This area is still experimental. In particular, route-level authentication is not yet applied consistently, so it should not be considered production hardened.

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
- `express-validator` rules on multiple APIs

These controls provide a useful application-security baseline, while the banking authorization gap noted above remains an explicit hardening item.

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

Selected tests can be run with:

```bash
cd backend
npm install
npm test
npm run build
```

## Project structure

```text
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

The highest-value next steps for this repository are:

1. choose one canonical database target and align Prisma schema, migrations and Docker Compose;
2. update ID validation to match the `cuid()`-based schema;
3. require authentication/authorization consistently across banking routes;
4. add CI for backend build/tests and frontend lint/build;
5. remove or isolate debug-only endpoints/screens before treating the app as deployable;
6. add deterministic demo data and screenshots once the integration baseline is stable.

## Why this repository is in the portfolio

This project is useful as a record of working through a broad business domain: customer ledgers, bank activity, file imports, invoice aging, collections and reporting. It complements smaller, more finished projects by showing how a larger application can be decomposed into domain modules and expanded iteratively.

It is intentionally presented with its current technical debt visible. The repository is a development project, not a claim of production accounting-software readiness.
