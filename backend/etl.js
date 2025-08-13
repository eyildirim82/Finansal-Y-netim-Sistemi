const fs = require('fs');
const Database = require('better-sqlite3');
const { parsePdf } = require('./parser');
const { categorize } = require('./categorizer');
const { enrichCounterparty } = require('./counterpart');
const { makeHash, reconcileBalances } = require('./quality');

async function run(filePath) {
  if (!filePath) {
    console.error('Kullanım: node etl.js <pdf_dosyasi>');
    process.exit(1);
  }

  const rows = await parsePdf(filePath);
  const enriched = rows.map(r => categorize(enrichCounterparty(r)));
  const withHash = enriched.map(tx => ({ ...tx, id: makeHash(tx), hash: makeHash(tx) }));

  const anomalies = reconcileBalances(withHash);
  if (anomalies.length) {
    console.warn('Bakiye tutarsızlıkları:', anomalies.length);
  }

  const db = new Database('hesap.db');
  const schema = fs.readFileSync('./schema.sql', 'utf8');
  db.exec(schema);

  const insert = db.prepare(`
    INSERT OR IGNORE INTO transactions
    (id, date_time, date_time_iso, description, debit, credit, amount, currency,
     balance, balance_currency, op, channel, direction, counterparty_name,
     counterparty_iban, hash, raw)
    VALUES
    (@id, @date_time, @date_time_iso, @description, @debit, @credit, @amount, @currency,
     @balance, @balance_currency, @operation, @channel, @direction, @counterparty_name,
     @counterparty_iban, @hash, @raw)
  `);

  const tx = db.transaction((items) => {
    for (const it of items) insert.run(it);
  });
  tx(withHash);

  console.log(`Yüklendi: ${withHash.length} satır (dupe'lar atlandı).`);
}

run(process.argv[2]).catch(err => {
  console.error(err);
  process.exit(1);
});
