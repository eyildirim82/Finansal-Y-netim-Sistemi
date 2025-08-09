const ExcelJS = require('exceljs');
const path = require('path');

// Utility functions from controller
const norm = (s) =>
  String(s ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase(); 

const HEADER_ALIASES = {
  'belge türü': 'belge türü',
  'tarih': 'tarih',
  'evrak no': 'evrak no',
  'açıklama': 'açıklama',
  'vade tarihi': 'vade tarihi',
  'matrah': 'matrah',
  'iskonto': 'iskonto',
  'i̇skonto': 'iskonto',
  'net matrah': 'net matrah',
  'kdv': 'kdv',
  'borç tutar': 'borç tutar',
  'borç tutarı': 'borç tutar',
  'alacak tutar': 'alacak tutar',
  'alacak tutarı': 'alacak tutar',
  'borç bakiye': 'borç bakiye',
  'alacak bakiye': 'alacak bakiye',
  'cari kodu': 'cari kodu',
  'cari adı': 'cari adı',
  'telefon': 'telefon',
  'adres': 'adres',
  'cari hesap türü': 'cari hesap türü',
  'özel kod(1)': 'özel kod(1)',
  'özel kod(2)': 'özel kod(2)',
  'borç': 'borç',
  'alacak': 'alacak',
  '#': '#'
};

function canon(label) {
  const key = norm(
    label && label.richText
      ? label.richText.map((p) => p.text).join('')
      : label
  );
  return HEADER_ALIASES[key] ?? key;
}

function cellToString(v) {
  if (v == null || v === undefined) return '';
  if (typeof v === 'object') {
    if (Array.isArray(v.richText)) {
      try {
        return v.richText
          .map((rt) => (rt && typeof rt === 'object' && rt.text != null ? String(rt.text) : ''))
          .join('')
          .trim();
      } catch {
        return '';
      }
    }
    if ('text' in v && v.text != null) {
      try {
        return String(v.text).trim();
      } catch {
        return '';
      }
    }
    if (v instanceof Date) return v.toLocaleDateString('tr-TR');
    if (typeof v === 'number') return String(v);
    if (typeof v === 'object' && v !== null && typeof v.toString === 'function') {
      try {
        const str = v.toString();
        if (typeof str === 'string' && str !== '[object Object]' && str !== 'null' && str !== 'undefined') {
          return str.trim();
        }
      } catch {
        return '';
      }
    }
    if ('value' in v && v.value != null) {
      return cellToString(v.value);
    }
    return '';
  }
  if (typeof v === 'string') return v.trim();
  if (typeof v === 'number') return String(v);
  if (typeof v === 'boolean') return String(v);
  try {
    return String(v).trim();
  } catch {
    return '';
  }
}

function getText(row, col) {
  if (!col || col < 1) return '';
  try {
    const cell = row.getCell(col);
    if (!cell) return '';
    return cellToString(cell.value);
  } catch (error) {
    return '';
  }
}

function rowContains(row, text) {
  if (!Array.isArray(row.values)) return false;
  const vals = row.values.map(cellToString);
  const searchText = norm(text);
  return vals.some(v => norm(v).includes(searchText));
}

function isTxHeaderRow(row) {
  const vals = Array.isArray(row.values) ? row.values.map(cellToString) : [];
  const normVals = vals.map(canon).filter(v => v && v !== '#');

  const requiredMin = ['belge türü', 'tarih', 'evrak no', 'borç tutar', 'alacak tutar'];
  const ok = requiredMin.every(r => normVals.includes(r));

  console.log('[DEBUG] isTxHeaderRow normVals:', normVals);
  console.log('[DEBUG] isTxHeaderRow requiredMin:', requiredMin);
  console.log('[DEBUG] isTxHeaderRow result:', ok);
  return ok;
}

function buildTxHeaderMap(row, map) {
  if (!Array.isArray(row.values)) return;
  console.log('[DEBUG] buildTxHeaderMap - Row values:', row.values.map(cellToString));
  
  row.eachCell((cell, col) => {
    const key = canon(cell.value);
    if (key && !(key in map)) {
      map[key] = col;
      console.log(`[DEBUG] buildTxHeaderMap - Added: "${key}" -> column ${col}`);
    }
  });
  
  console.log('[DEBUG] buildTxHeaderMap - Final map:', map);
}

function col(map, label) {
  const result = map[canon(label)];
  console.log(`[DEBUG] col - Looking for "${label}" (canon: "${canon(label)}") -> column ${result}`);
  return result;
}

async function debugParser() {
  try {
    const filePath = path.join(__dirname, 'ekstre.xlsx');
    console.log('[DEBUG] Reading file:', filePath);
    
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    
    const sheet = workbook.worksheets[0];
    console.log(`[DEBUG] Sheet name: ${sheet.name}, Rows: ${sheet.rowCount}, Columns: ${sheet.columnCount}`);
    
    let i = 2;
    let state = 'SEEK_CUSTOMER';
    let currentCustomer = null;
    const txHeaderMap = {};
    
    console.log(`[DEBUG] Starting parser with ${sheet.rowCount} rows`);
    
    while (i <= Math.min(sheet.rowCount, 50)) { // İlk 50 satırı kontrol et
      const row = sheet.getRow(i);
      console.log(`\n[DEBUG] === ROW ${i} ===`);
      console.log(`[DEBUG] State: ${state}`);
      console.log(`[DEBUG] Row values:`, row.values ? row.values.map(cellToString).slice(0, 5) : 'No values');
      
      if (state === 'SEEK_CUSTOMER') {
        if (
          rowContains(row, 'Cari Kodu') ||
          rowContains(row, 'Cari Adı') ||
          rowContains(row, 'Müşteri') ||
          rowContains(row, 'Hesap Kodu')
        ) {
          console.log(`[DEBUG] Customer header found at row ${i}`);
          currentCustomer = `Customer_${i}`;
          state = 'SEEK_TX_HEADER';
          i++;
          continue;
        }
        i++;
      }
      
      else if (state === 'SEEK_TX_HEADER') {
        if (isTxHeaderRow(row)) {
          console.log(`[DEBUG] Transaction header found at row ${i}`);
          buildTxHeaderMap(row, txHeaderMap);
          i++;
          state = 'READ_TX_ROWS';
          continue;
        }
        i++;
      }
      
      else if (state === 'READ_TX_ROWS') {
        if (rowContains(row, 'Cari Kodu')) {
          console.log(`[DEBUG] New customer start, changing state`);
          state = 'SEEK_CUSTOMER';
          continue;
        }
        
        // Parse transaction row
        console.log(`[DEBUG] Parsing transaction row ${i}`);
        const t = (k) => getText(row, col(txHeaderMap, k));
        const n = (k) => {
          const val = t(k);
          const num = parseFloat(val.replace(/[^\d.,]/g, '').replace(',', '.'));
          return isNaN(num) ? 0 : num;
        };
        
        const docType = t('Belge Türü');
        const tarih = t('Tarih');
        const voucherNo = t('Evrak No');
        const description = t('Açıklama');
        const debit = n('Borç Tutar');
        const credit = n('Alacak Tutar');
        
        console.log(`[DEBUG] Parsed transaction:`, {
          docType,
          tarih,
          voucherNo,
          description,
          debit,
          credit
        });
        
        i++;
      }
    }
    
  } catch (error) {
    console.error('[ERROR] Debug parser error:', error);
  }
}

debugParser();
