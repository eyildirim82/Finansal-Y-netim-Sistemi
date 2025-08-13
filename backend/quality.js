const crypto = require('crypto');

function makeHash(tx) {
  const key = [
    tx.date_time_iso,
    (tx.amount ?? 0).toFixed(2),
    (tx.balance ?? 0).toFixed(2),
    (tx.description || '').slice(0, 120)
  ].join('|');
  return crypto.createHash('sha256').update(key).digest('hex');
}

function reconcileBalances(transactions) {
  const sorted = [...transactions].sort((a,b)=>a.date_time_iso.localeCompare(b.date_time_iso));
  const anomalies = [];
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i-1], curr = sorted[i];
    const expected = (prev.balance ?? 0) + (curr.credit ?? 0) - (curr.debit ?? 0);
    if (Math.abs(expected - (curr.balance ?? 0)) > 0.01) {
      anomalies.push({ index: i, prev_balance: prev.balance, expected, actual: curr.balance, tx: curr });
    }
  }
  return anomalies;
}

module.exports = { makeHash, reconcileBalances };
