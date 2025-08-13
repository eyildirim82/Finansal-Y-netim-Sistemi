CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  date_time TEXT,
  date_time_iso TEXT NOT NULL,
  description TEXT,
  debit REAL NOT NULL DEFAULT 0,
  credit REAL NOT NULL DEFAULT 0,
  amount REAL NOT NULL,
  currency TEXT NOT NULL,
  balance REAL NOT NULL,
  balance_currency TEXT NOT NULL,
  op TEXT,
  channel TEXT,
  direction TEXT,
  counterparty_name TEXT,
  counterparty_iban TEXT,
  hash TEXT NOT NULL UNIQUE,
  raw TEXT
);

CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date_time_iso);
CREATE INDEX IF NOT EXISTS idx_transactions_counterparty ON transactions(counterparty_name);
CREATE INDEX IF NOT EXISTS idx_transactions_op ON transactions(op);
