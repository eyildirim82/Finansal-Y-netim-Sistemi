# Banking Module

The banking module is an **experimental, authenticated ingestion and payment-matching area** of the Financial Management System. It currently combines provider-specific email parsing, PDF statement workflows, persisted bank transactions, customer matching and operational diagnostics.

It is not presented as an official bank API integration or as production-ready banking software. The email parser is currently tailored to Yapı Kredi-style FAST / HAVALE / EFT notification text and depends on mailbox/provider formats that may change outside this repository.

## Current scope

Implemented or represented in the current codebase:

- IMAP mailbox connection and provider-specific email parsing
- FAST / HAVALE / EFT text-pattern recognition
- incoming/outgoing direction detection
- duplicate prevention through `messageId`
- persisted bank transactions and payment-match records
- automatic and manual customer matching
- matching and mailbox statistics
- date-range mailbox ingestion
- balance-gap / missing-transaction analysis
- PDF upload, parsing, persistence and ETL-oriented flows
- process-local monitoring controls built around IMAP IDLE
- cleanup and deletion operations for imported bank transactions

## Authentication and upload boundary

The banking router applies the shared `authMiddleware` before declaring its endpoints, so every route below requires an authenticated request.

PDF upload routes use Multer and currently enforce:

- multipart field name: `pdf`
- MIME type: `application/pdf`
- maximum file size: 10 MB

This is an application-layer validation boundary. It is not a claim that arbitrary uploaded documents are fully trusted or malware-scanned.

## Data model

### `BankTransaction`

The persisted bank-transaction model currently contains:

```prisma
model BankTransaction {
  id                String   @id @default(cuid())
  messageId         String   @unique
  bankCode          String   @default("YAPIKREDI")
  transactionType   String?
  direction         String
  accountIban       String
  maskedAccount     String?
  transactionDate   DateTime
  amount            Decimal  @db.Decimal(18, 2)
  senderName        String?
  counterpartyName  String?
  balanceAfter      Decimal? @db.Decimal(18, 2)
  isMatched         Boolean  @default(false)
  matchedCustomerId String?
  confidenceScore   Float?
  rawEmailData      String?
  parsedData        String?
  createdAt         DateTime @default(now())
  processedAt       DateTime?
}
```

Money is stored with PostgreSQL `DECIMAL(18,2)`. Matching confidence remains floating point because it is a ratio rather than money.

`rawEmailData` and `parsedData` are nullable string columns containing JSON-encoded application data. The current schema does **not** implement or claim application-level encryption-at-rest for these fields.

### `PaymentMatch`

```prisma
model PaymentMatch {
  id                String   @id @default(cuid())
  bankTransactionId String
  customerId        String
  matchedAmount     Decimal  @db.Decimal(18, 2)
  confidenceScore   Float
  matchMethod       String
  isConfirmed       Boolean  @default(false)
  createdAt         DateTime @default(now())
}
```

The module records automatic/manual match metadata separately from the bank transaction.

### `PDFTransaction`

PDF statement experiments also have a separate `PDFTransaction` model. Its debit, credit, amount and balance fields use `DECIMAL(18,2)`, while statement metadata such as operation, channel, direction, counterparty and raw source text are stored separately.

## API contract

The router is mounted at `/api/banking`.

| Method | Route | Current purpose |
| --- | --- | --- |
| `POST` | `/fetch-emails` | Fetch unseen provider-filtered mailbox messages, parse them and attempt matching |
| `POST` | `/process-email` | Manually submit email content + `messageId` for parsing |
| `GET` | `/transactions` | List persisted bank transactions with pagination/filtering |
| `GET` | `/pdf-transactions` | List separately persisted PDF transactions |
| `GET` | `/unmatched` | List bank transactions whose `isMatched` flag is false |
| `POST` | `/match` | Manually match a bank transaction to a customer |
| `GET` | `/email-settings` | Return non-password mailbox/provider configuration status |
| `PUT` | `/email-settings` | Update process-local mailbox settings and reconnect |
| `POST` | `/test-connection` | Attempt an IMAP connect/disconnect cycle |
| `GET` | `/matching-stats` | Return matched/unmatched counts and match rate |
| `POST` | `/run-auto-matching` | Run matching against currently unmatched transactions |
| `GET` | `/email-stats` | Return mailbox counts plus in-process parser metrics |
| `POST` | `/fetch-emails-by-date` | Fetch and process messages within a supplied date range |
| `POST` | `/start-monitoring` | Start the current IMAP-IDLE monitoring path |
| `POST` | `/stop-monitoring` | Invoke the current monitoring stop hook |
| `GET` | `/missing-transactions` | Analyze transaction/balance gaps heuristically |
| `POST` | `/parse-pdf` | Upload and parse a PDF statement without directly treating it as email |
| `POST` | `/save-pdf-transactions` | Persist supplied parsed PDF transactions as bank transactions |
| `POST` | `/process-pdf-etl` | Upload a PDF and run the ETL-oriented processing path |
| `DELETE` | `/transactions/:transactionId` | Delete one bank transaction |
| `DELETE` | `/transactions` | Delete transactions matching request filters |
| `POST` | `/cleanup-old-transactions` | Preview or execute date-based transaction cleanup |

The frontend `bankingService` maps to these routes for the main transaction, email, matching, PDF, cleanup and missing-transaction workflows.

## Mailbox configuration

The IMAP service reads these runtime variables:

```env
# Required connection values. EMAIL_* is preferred; MAIL_* is accepted as fallback.
EMAIL_HOST=
EMAIL_PORT=993
EMAIL_USER=
EMAIL_PASS=
EMAIL_SECURE=true

# Optional provider filters
YAPIKREDI_FROM_EMAIL=
YAPIKREDI_SUBJECT_FILTER=FAST OR HAVALE OR EFT OR asistan

# Optional processing configuration
EMAIL_BATCH_SIZE=10
EMAIL_CONCURRENCY_LIMIT=5
EMAIL_TIMEOUT=5000
EMAIL_MAX_RETRIES=3
EMAIL_RETRY_DELAY=1000

# Exposed as status/config flags by the controller
YAPIKREDI_AUTO_PROCESS=false
YAPIKREDI_REALTIME_MONITORING=false
```

Equivalent `MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_PASS` and `MAIL_SECURE` variables are accepted as fallbacks by the connection code.

There is no hard-coded `imap.yapikredi.com.tr` requirement in the current implementation. Host and credentials come from runtime configuration.

`GET /email-settings` deliberately returns configuration/status fields without returning the mailbox password.

`PUT /email-settings` currently mutates `process.env` in the running Node.js process and reconnects. This is **not persistent configuration storage**; a process restart can discard those changes. The current service also accepts a `secure` property in the update request type but does not write it back to `EMAIL_SECURE`, so secure-mode changes should be managed through runtime environment configuration rather than assumed to persist through this endpoint.

## Provider-specific parsing

`YapiKrediFASTEmailService` currently uses regular expressions for Yapı Kredi-style FAST, HAVALE and EFT notification bodies. It extracts or derives values such as:

- account IBAN / masked account
- transaction date
- counterparty name
- amount
- available balance when present
- `IN` / `OUT` direction

Direction detection uses subject hints such as `asistan-gelen` / `asistan-giden` and falls back to Turkish phrases in the message body.

Messages that do not match the expected patterns are appended to:

```text
logs/failed-fast-emails.log
```

The provider parser recognizes FAST / HAVALE / EFT during parsing and persists that classification in the optional `BankTransaction.transactionType` field. PDF and other non-email import paths may leave the field `null`.

## Duplicate handling and matching

Email ingestion checks `messageId` before inserting a `BankTransaction`; the database also enforces a unique constraint on that field.

After a new email transaction is saved, the controller calls `PaymentMatchingService` and stores its match result. Manual matching is also available through `POST /match`.

PDF-import persistence uses a different duplicate heuristic based on transaction date, amount and direction rather than an email `messageId`.

## Monitoring and metrics

The email service keeps process-memory metrics for:

- total/processed/failed emails
- total and average processing time
- emails per second
- retry count

The monitoring path opens the inbox and uses the current IMAP IDLE implementation. Its callback currently logs detected transactions; the controller explicitly notes that WebSocket or Server-Sent Events delivery to the frontend is still future work.

The current `stopRealtimeMonitoring()` implementation does not contain an explicit IMAP-IDLE cancellation/disconnect operation. Treat the start/stop endpoints as an experimental process-level control surface rather than a mature background-job subsystem.

## PDF workflows

Two PDF upload endpoints accept the `pdf` multipart field:

```text
POST /api/banking/parse-pdf
POST /api/banking/process-pdf-etl
```

`parse-pdf` parses an uploaded statement and can compare parsed rows with existing bank transactions for missing-transaction analysis.

`save-pdf-transactions` accepts parsed transaction data in JSON and persists bank-transaction records with `bankCode = "PDF_IMPORT"`.

The schema also keeps a separate `PDFTransaction` representation used by PDF-statement processing experiments. These paths are still prototype functionality and should be validated with the statement formats expected in a deployment before relying on them operationally.

## Security and privacy notes

What the current code does establish:

- every banking route passes through shared JWT authentication middleware;
- uploaded banking PDFs are limited to 10 MB and checked for `application/pdf` MIME type;
- mailbox credentials are read from runtime configuration;
- `GET /email-settings` does not expose the mailbox password;
- duplicate email transaction IDs are constrained by a unique database field;
- monetary persistence uses exact decimal database types.

What this repository does **not** claim:

- official Yapı Kredi API partnership/integration;
- encryption-at-rest for `rawEmailData` / `parsedData` at the application schema layer;
- malware scanning or content sanitization guarantees for uploaded PDFs;
- durable background-job orchestration for IMAP monitoring;
- provider-format stability;
- accounting-grade reconciliation completeness.

## Verification

Repository CI verifies the backend against a clean PostgreSQL 15 service:

```bash
cd backend
npm ci
npm audit --omit=dev --audit-level=high
npx prisma generate
npx prisma migrate deploy
npm run build
npm test
```

The normal `Verify` workflow also smoke-starts the compiled API and validates the Docker Compose configuration.

There is currently no dedicated end-to-end test that connects to a real production mailbox. Mailbox/provider behavior therefore remains environment-dependent and should be qualified separately before deployment.

## Known limitations / follow-up work

- provider parsing is regex- and format-dependent;
- mailbox settings updated through the API are process-local rather than persisted configuration;
- `secure` updates are not currently written back by `updateEmailSettings`;
- realtime monitoring does not yet publish frontend WebSocket/SSE events and the stop hook does not explicitly terminate IDLE;
- PDF parsing/ETL behavior depends on the uploaded statement format;
- broader banking integration coverage is still needed.

For portfolio purposes, this module is best read as an example of **authenticated financial-data ingestion, provider-specific parsing, exact-money persistence, matching workflows and iterative hardening**, not as a finished banking integration product.
