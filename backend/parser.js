const pdf = require('pdf-parse');
const fs = require('fs');

// Tarih-saat: boşluk opsiyonel (PDF satır birleştirmelerinde boşluk kaybolabiliyor)
const DATE_RE = /^(\d{2}\/\d{2}\/\d{4})\s*(\d{2}:\d{2}:\d{2})\b/;
const DATE_ANY_RE = /(\d{2}\/\d{2}\/\d{4})\s*(\d{2}:\d{2}:\d{2})/;

function trNumberToFloat(s) {
  return parseFloat(s.replace(/\./g, '').replace(',', '.'));
}

function normalizeLine(raw) {
  if (!raw) return '';
  // NBSP -> space, çoklu boşluk sıkıştır
  let line = raw.replace(/\u00a0/g, ' ').replace(/[\t ]+/g, ' ').trim();
  // TL ile rakam yapışmalarını ayır ("TL3.026,20" -> "TL 3.026,20")
  line = line.replace(/(TL)(\d)/g, '$1 $2');
  // Para birimi ile miktar yapışması (örn: "USD3.000,00")
  line = line.replace(/([A-Z]{2,3})(\d)/g, '$1 $2');
  return line;
}

function splitIntoRecords(lines) {
  const rows = [];
  let current = '';
  for (const raw of lines) {
    const line = normalizeLine(raw);
    if (!line) continue;
    // sayfa baş/alt ve tablo başlıkları
    if (/^\d+\/\d+$/.test(line)) continue; // 1/3
    if (/^(Hesap Hareketleri|Yapı ve Kredi Bankası|www\.yapikredi\.com\.tr|Ticaret Sicil Numarası|Mersis No:|İşletmenin Merkezi|Blok 34330|^T: \(|^F: \()/.test(line)) continue;
    if (/Tarih Aralığı|Müşteri Adı|IBAN\/Hesap No|Kullanılabilir Bakiye|TarihSaatİşlemKanalAçıklamaİşlem TutarıBakiye/.test(line)) continue;
    if (/^----BLOKE BAKİYESİ|^----Diğer Bekleyen İşlemler/.test(line)) continue;

    // datetime tespiti: satırın herhangi bir yerinde olabilir
    const dtAnywhere = line.match(DATE_ANY_RE);

    if (dtAnywhere) {
      // yeni kayıt başlat
      if (current) rows.push(current.trim());
      current = line;
    } else {
      // mevcut kayıt devamı
      current += (current ? ' ' : '') + line;
    }
  }
  if (current) rows.push(current.trim());
  return rows;
}

function postProcessDesc(desc) {
  const channel =
    /Internet\s*-\s*Mobil/i.test(desc) ? 'Internet - Mobil'
      : /Diğer/i.test(desc) ? 'Diğer'
      : /Şube/i.test(desc) ? 'Şube' : null;

  const direction = /\bGELEN\b/i.test(desc) ? 'GELEN'
                   : /\bG[İI]DEN\b|\bGIDEN\b/i.test(desc) ? 'GİDEN' : null;

  const op = /FAST/.test(desc) ? 'FAST'
          : /EFT/.test(desc) ? 'EFT'
          : /HAVALE/.test(desc) ? 'HAVALE'
          : /Fatura Ödemesi/i.test(desc) ? 'Fatura'
          : /POS\b/i.test(desc) ? 'POS'
          : /Para Gönder/i.test(desc) ? 'Para Gönder'
          : 'Diğer';

  let description = desc.replace(DATE_ANY_RE, '').trim();
  description = description.replace(/^(Para\s+Gönder|Diğer)\s*(Internet\s*-\s*Mobil)?/i, '').trim();
  description = description.replace(/\s+/g, ' ').trim();

  return { channel, direction, op, description };
}

function parseRow(row) {
  // Tarih/saat'i bul (herhangi bir yerde)
  const dtMatch = row.match(DATE_ANY_RE);
  if (!dtMatch) return null;
  const datePart = dtMatch[1];
  const timePart = dtMatch[2];
  const dt = `${datePart} ${timePart}`;

  // Tüm parasal değerler
  const amountMatches = row.match(/-?\d{1,3}(?:\.\d{3})*,\d{2}/g) || [];
  if (amountMatches.length < 2) return null;

  const transactionAmountStr = amountMatches[amountMatches.length - 2];
  const balanceStr = amountMatches[amountMatches.length - 1];

  const amount = trNumberToFloat(transactionAmountStr);
  const balance = trNumberToFloat(balanceStr);

  // Para birimi sondan taranır; yoksa TL
  const currencyMatchAll = row.match(/\b(TL|USD|EUR)\b/g);
  const currency = currencyMatchAll ? currencyMatchAll[currencyMatchAll.length - 1] : 'TL';

  const meta = postProcessDesc(row);
  const debit = amount < 0 ? Math.abs(amount) : 0;
  const credit = amount > 0 ? amount : 0;

  const [dd, mm, yyyy] = datePart.split('/');
  const date_time_iso = `${yyyy}-${mm}-${dd}T${timePart}`;

  // Açıklamadan miktar kalıplarını da temizle
  let description = meta.description;
  amountMatches.forEach(s => { description = description.replace(s, ' ').trim(); });
  description = description.replace(/\b(TL|USD|EUR)\b/g, ' ').replace(/\s+/g, ' ').trim();

  return {
    date_time: dt,
    date_time_iso,
    operation: meta.op,
    channel: meta.channel,
    direction: meta.direction,
    description,
    debit, credit,
    amount, currency,
    balance, balance_currency: currency,
    raw: row
  };
}

async function parsePdf(bufferOrPath) {
  const dataBuffer = Buffer.isBuffer(bufferOrPath) ? bufferOrPath : fs.readFileSync(bufferOrPath);
  const { text } = await pdf(dataBuffer);
  const lines = text.split(/\r?\n/);
  const stitched = splitIntoRecords(lines);
  // Debug
  try {
    console.log(`[parser] lines: ${lines.length}, stitched: ${stitched.length}`);
    console.log('[parser] first stitched sample:', stitched[0]);
  } catch {}
  const parsed = stitched.map(parseRow).filter(Boolean);
  console.log(`[parser] parsed: ${parsed.length}`);
  return parsed;
}

module.exports = { parsePdf };
