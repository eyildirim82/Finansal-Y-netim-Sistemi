const fs = require('fs');
const pdf = require('pdf-parse');

// Parser functions
const DATE_RE = /^\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}:\d{2}/;
const AMOUNT_BLOCK_RE = new RegExp(
  String.raw`(-?\d{1,3}(?:\.\d{3})*,\d{2})\s+([A-Z]{2,3})\s+(\d{1,3}(?:\.\d{3})*,\d{2})\s+([A-Z]{2,3})?$`
);

function trNumberToFloat(s) {
  return parseFloat(s.replace(/\./g, '').replace(',', '.'));
}

function splitIntoRecords(lines) {
  const rows = [];
  let current = '';
  for (const raw of lines) {
    const line = raw.replace(/\u00a0/g, ' ').trim();
    if (!line) continue;
    if (/^\d+\/\d+$/.test(line)) continue;
    if (line.includes('Tarih Aralığı') || line.includes('Müşteri Adı')) continue;
    if (line.includes('Hesap Hareketleri') || line.includes('Yapı ve Kredi Bankası')) continue;

    if (DATE_RE.test(line)) {
      console.log(`Tarih bulundu: ${line.substring(0, 50)}...`);
      if (current) rows.push(current.trim());
      current = line;
    } else if (/\d{2}\/\d{2}\/\d{4}/.test(line)) {
      console.log(`Tarih pattern bulundu ama regex eşleşmedi: ${line.substring(0, 50)}...`);
      if (current) rows.push(current.trim());
      current = line;
    } else {
      current += ' ' + line;
    }
  }
  if (current) rows.push(current.trim());
  return rows;
}

function parseRow(row) {
  const m = row.match(AMOUNT_BLOCK_RE);
  if (!m) {
    console.log(`Amount block bulunamadı: ${row.substring(0, 100)}...`);
    return null;
  }

  const amount = trNumberToFloat(m[1]);
  const currency = m[2] || 'TL';
  const balance = trNumberToFloat(m[3]);
  const balanceCurrency = m[4] || currency;

  const head = row.slice(0, m.index).trim();
  const dt = head.match(DATE_RE)?.[0] ?? null;
  
  if (!dt) return null;
  
  const [d, t] = dt.split(/\s+/);
  const [dd, mm, yyyy] = d.split('/');
  const date_time_iso = `${yyyy}-${mm}-${dd}T${t}`;

  return {
    date_time: dt,
    date_time_iso,
    amount, currency,
    balance, balance_currency: balanceCurrency,
    raw: row
  };
}

async function testETLSimple() {
  try {
    const filePath = 'uploads/pdf-1755020185337-353467719.pdf';
    console.log('🔄 ETL basit test ediliyor...');
    
    const dataBuffer = fs.readFileSync(filePath);
    const { text } = await pdf(dataBuffer);

    const lines = text.split(/\r?\n/);
    console.log(`[ETL] PDF lines: ${lines.length}`);
    
    const stitched = splitIntoRecords(lines);
    console.log(`[ETL] Stitched records: ${stitched.length}`);
    
    // Sadece ilk 3 record'u test et
    console.log('İlk 3 stitched record:');
    stitched.slice(0, 3).forEach((record, i) => {
      console.log(`${i+1}. ${record}`);
    });
    
    const parsed = stitched.slice(0, 3).map(parseRow).filter(Boolean);
    console.log(`[ETL] Parsed transactions: ${parsed.length}`);

    if (parsed.length === 0) {
      console.log('❌ Hiç işlem parse edilemedi');
      return;
    }

    console.log('✅ İlk 3 işlem:');
    parsed.slice(0, 3).forEach((tx, i) => {
      console.log(`${i+1}. ${tx.date_time} - ${tx.amount} ${tx.currency} - Bakiye: ${tx.balance}`);
    });
    
  } catch (error) {
    console.error('❌ ETL test hatası:', error);
  }
}

testETLSimple();
