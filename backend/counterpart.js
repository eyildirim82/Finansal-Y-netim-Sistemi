const IBAN_RE = /\bTR\d{24}\b/;
const DIR_OP_PREFIX = /(G[İI]DEN|GELEN)\s+(FAST|EFT|HAVALE)\s*-\s*/i;

function extractCounterparty(description) {
  const iban = (description.match(IBAN_RE) || [null])[0];

  let counterparty_name = null;
  const m = description.match(DIR_OP_PREFIX);
  if (m) {
    const rest = description.slice(m.index + m[0].length);
    counterparty_name = rest.split('-')[0].trim();
  } else {
    const parts = description.split('-').map(s => s.trim()).filter(Boolean);
    if (parts.length >= 2) counterparty_name = parts[1];
  }
  if (counterparty_name && counterparty_name.length < 2) counterparty_name = null;

  return { counterparty_name, counterparty_iban: iban };
}

function enrichCounterparty(tx) {
  const { counterparty_name, counterparty_iban } = extractCounterparty(tx.description || '');
  return { ...tx, counterparty_name, counterparty_iban };
}

module.exports = { enrichCounterparty, extractCounterparty };
