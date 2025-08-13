const RULES = [
  { key: 'fee_bsmv', test: /\bBSMV\b/i },
  { key: 'fee_eft',  test: /ELEKTRONİK FON TRANSFERİ.*ÜCRETİ/i },
  { key: 'incoming_fast', test: /\bGELEN\s+FAST\b/i },
  { key: 'outgoing_fast', test: /\bG[İI]DEN\s+FAST\b/i },
  { key: 'incoming_eft',  test: /\bGELEN\s+EFT\b/i },
  { key: 'outgoing_eft',  test: /\bG[İI]DEN\s+EFT\b/i },
  { key: 'pos_spend',     test: /\bPOS\b/i },
  { key: 'invoice',       test: /Fatura|ISKI|SU|Elektrik|Doğalgaz/i },
  { key: 'havale_in',     test: /\bGELEN\s+HAVALE\b/i },
  { key: 'havale_out',    test: /\bG[İI]DEN\s+HAVALE\b/i },
];

function categorize(tx) {
  const text = `${tx.operation || ''} ${tx.direction || ''} ${tx.description || ''}`;
  const tags = RULES.filter(r => r.test.test(text)).map(r => r.key);

  let category = 'other';
  if (tags.includes('incoming_fast') || tags.includes('incoming_eft') || tags.includes('havale_in')) category = 'incoming';
  else if (tags.includes('outgoing_fast') || tags.includes('outgoing_eft') || tags.includes('havale_out')) category = 'outgoing';
  else if (tags.some(t => t.startsWith('fee'))) category = 'fee';
  else if (tags.includes('pos_spend')) category = 'pos';
  else if (tags.includes('invoice')) category = 'invoice';

  return { ...tx, tags, category };
}

module.exports = { categorize };
