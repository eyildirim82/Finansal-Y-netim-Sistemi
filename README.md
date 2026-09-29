# Financial Management System

A full-stack financial management application that brings income/expense tracking, customer accounts, reporting and data import workflows into a single system.

Built with **React, TypeScript, Node.js, Express, PostgreSQL and Prisma**.

## Current Status

This project is under active development. The core application structure, authentication, dashboard, database model and main UI sections are in place; several operational workflows are still being expanded.

## Highlights

- JWT-based authentication
- Financial dashboard and summary views
- Income and expense tracking structure
- Customer / account management
- Reporting modules
- Excel and CSV import workflows
- PostgreSQL database with Prisma ORM
- REST API architecture
- Responsive React + Tailwind CSS interface
- Input validation, rate limiting, CORS and Helmet security middleware
- Turkish / English backend response localization

## Tech Stack

### Frontend
- React 18
- Vite
- Tailwind CSS
- React Router
- React Query
- React Hook Form

### Backend
- Node.js
- Express
- TypeScript
- Prisma ORM
- JWT authentication
- Multer

### Database
- PostgreSQL

## Architecture

```text
React Client
    │
    ▼
REST API
Node.js + Express + TypeScript
    │
    ▼
Prisma ORM
    │
    ▼
PostgreSQL
```

## Main Modules

### Authentication
- Login and registration
- Profile access
- Password change flow
- Password hashing with bcrypt

### Transactions
- Income records
- Expense records
- Customer-related transactions
- CRUD-oriented transaction workflows

### Customers
- Customer records
- Account balances
- Customer transaction history

### Reporting
- Dashboard summaries
- Income / expense reporting
- Customer reports
- Aging reports

### Import
- Excel import
- CSV import

## Project Structure

```text
├── backend/
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   ├── transactions/
│   │   │   ├── customers/
│   │   │   ├── reports/
│   │   │   └── imports/
│   │   └── shared/
│   ├── prisma/
│   │   └── schema.prisma
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── contexts/
│   │   └── services/
│   └── package.json
└── shared/
```

## Data Model

Core entities include:

- `users`
- `customers`
- `transactions`
- `categories`
- `balances`

Transaction types currently include:

- `INCOME`
- `EXPENSE`
- `CUSTOMER`

## API Overview

### Auth
- `POST /api/auth/login`
- `POST /api/auth/register`
- `GET /api/auth/profile`
- `PUT /api/auth/change-password`

### Transactions
- `GET /api/transactions`
- `POST /api/transactions`
- `PUT /api/transactions/:id`
- `DELETE /api/transactions/:id`

### Customers
- `GET /api/customers`
- `POST /api/customers`
- `GET /api/customers/:id/transactions`
- `GET /api/customers/:id/balance`

### Reports
- `GET /api/reports/dashboard`
- `GET /api/reports/income-expense`
- `GET /api/reports/customers`
- `GET /api/reports/aging`

### Import
- `POST /api/imports/excel`
- `POST /api/imports/csv`

## Security

The backend includes:

- JWT authentication
- bcrypt password hashing
- Rate limiting
- Input validation
- CORS configuration
- Helmet security middleware

## Localization

Backend responses support Turkish and English through the `Accept-Language` header (`tr` / `en`).

## Running Locally

### Requirements
- Node.js 18+
- PostgreSQL 12+
- npm or yarn

### Backend

```bash
cd backend
npm install
cp .env.example .env
npm run prisma:migrate
npm run prisma:generate
npm run dev
```

Example environment variables:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/finansal_yonetim"
JWT_SECRET="your-super-secret-jwt-key-here"
PORT=3001
NODE_ENV=development
LOG_LEVEL=info
LOG_FILE="./logs/app.log"
FRONTEND_URL="http://localhost:3000"
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Development Focus

Current development work is focused on completing transaction and customer workflows, expanding import/export capabilities, strengthening reporting and finishing frontend/backend integration.

## About

This project demonstrates full-stack application development across authentication, business data modeling, REST API design, reporting, file import workflows and application security.
