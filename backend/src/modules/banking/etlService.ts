import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import pdf from 'pdf-parse';

const prisma = new PrismaClient();

// Parser functions - Kanıtlanmış yaklaşım
const DATE_RE = /^\d{2}\/\d{2}\/\d{4}\d{2}:\d{2}:\d{2}/;
const AMOUNT_BLOCK_RE = new RegExp(
  String.raw`(-?\d{1,3}(?:\.\d{3})*,\d{2})\s*([A-Z]{2,3})?(\d{1,3}(?:\.\d{3})*,\d{2})\s*([A-Z]{2,3})?$`
);

function trNumberToFloat(s: string): number {
  return parseFloat(s.replace(/\./g, '').replace(',', '.'));
}

function splitIntoRecords(lines: string[]): string[] {
  const rows: string[] = [];
  let current = '';
  
  for (const raw of lines) {
    const line = raw.replace(/\u00a0/g, ' ').trim();
    if (!line) continue;
    
    // Başlık/altlık ve "Tarih Aralığı / Müşteri..." bloklarını atla
    if (/^\d+\/\d+$/.test(line)) continue; // Sayfa numarası
    if (line.includes('Tarih Aralığı') || line.includes('Müşteri Adı')) continue;
    if (line.includes('Hesap Hareketleri') || line.includes('Yapı ve Kredi Bankası')) continue;

    // Kayıt başlangıcı regex'i: ^\d{2}/\d{2}/\d{4}\s+\d{2}:\d{2}:\d{2}
    if (DATE_RE.test(line)) {
      if (current) rows.push(current.trim());
      current = line;
    } else {
      // Başlamıyorsa önceki satıra ekle (çok satırlı açıklamalar için)
      current += ' ' + line;
    }
  }
  
  if (current) rows.push(current.trim());
  return rows;
}

function postProcessDesc(desc: string) {
  const channel =
    desc.includes('Internet - Mobil') || desc.includes('Internet  - Mobil') ? 'Internet - Mobil'
      : desc.includes('Diğer') ? 'Diğer'
      : desc.includes('Şube') ? 'Şube' : null;

  const direction = /GELEN\b/.test(desc) ? 'GELEN'
                   : /GİDEN\b|GIDEN\b/.test(desc) ? 'GİDEN' : null;

  const op = /FAST/.test(desc) ? 'FAST'
           : /EFT/.test(desc) ? 'EFT'
           : /HAVALE/.test(desc) ? 'HAVALE'
           : desc.includes('Para Gönder') ? 'Para Gönder'
           : desc.includes('Fatura Ödemesi') ? 'Fatura'
           : desc.includes('POS ') ? 'POS'
           : 'Diğer';

  let description = desc.replace(DATE_RE, '').trim();
  description = description.replace(/^(Para\s+Gönder|Diğer)\s*(Internet\s*-\s*Mobil)?/, '').trim();

  return { channel, direction, op, description };
}

function parseRow(row: string) {
  // Sağ uçta hep şu blok var: (<işlem_tutarı>) <PB> (<bakiye>) <PB>
  const m = row.match(AMOUNT_BLOCK_RE);
  if (!m) return null;

  // Türkçe sayıyı sayıya çevir: noktaları sil, virgülü nokta yap
  const amount = trNumberToFloat(m[1]);
  const currency = m[2] || 'TL';
  const balance = trNumberToFloat(m[3]);
  const balanceCurrency = m[4] || currency;

  // Açıklama, tarih-saat ve sağdaki tutar/bakiye arasındaki kalan gövde
  const head = row.slice(0, m.index).trim();
  const dt = head.match(DATE_RE)?.[0] ?? null;
  
  if (!dt) return null;
  
  // Tarihi ISO-8601'e çevir
  const datePart = dt.substring(0, 10); // 11/08/2025
  const timePart = dt.substring(10); // 17:39:14
  const [dd, mm, yyyy] = datePart.split('/');
  const date_time_iso = `${yyyy}-${mm}-${dd}T${timePart}`;

  // Açıklama/kanal/işlem türü çıkarımı
  const meta = postProcessDesc(head);

  // Borç/Alacak: tutar negatifse borç, pozitifse alacak
  const debit = amount < 0 ? Math.abs(amount) : 0;
  const credit = amount > 0 ? amount : 0;

  return {
    date_time: dt,
    date_time_iso,
    operation: meta.op,
    channel: meta.channel,
    direction: meta.direction,
    description: meta.description,
    debit: Number(debit),
    credit: Number(credit),
    amount: Number(amount),
    currency,
    balance: Number(balance),
    balance_currency: balanceCurrency,
    raw: row
  };
}

// Categorizer functions
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

function categorize(tx: any) {
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

// Counterparty functions
const IBAN_RE = /\bTR\d{24}\b/;
const DIR_OP_PREFIX = /(G[İI]DEN|GELEN)\s+(FAST|EFT|HAVALE)\s*-\s*/i;

function extractCounterparty(description: string) {
  const iban = (description.match(IBAN_RE) || [null])[0];

  let counterparty_name = null;
  const m = description.match(DIR_OP_PREFIX);
  if (m && m.index !== undefined) {
    const rest = description.slice(m.index + m[0].length);
    counterparty_name = rest.split('-')[0].trim();
  } else {
    const parts = description.split('-').map(s => s.trim()).filter(Boolean);
    if (parts.length >= 2) counterparty_name = parts[1];
  }
  if (counterparty_name && counterparty_name.length < 2) counterparty_name = null;

  return { counterparty_name, counterparty_iban: iban };
}

function enrichCounterparty(tx: any) {
  const { counterparty_name, counterparty_iban } = extractCounterparty(tx.description || '');
  return { ...tx, counterparty_name, counterparty_iban };
}

// Quality functions
function makeHash(tx: any): string {
  const key = [
    tx.date_time_iso,
    (tx.amount ?? 0).toFixed(2),
    (tx.balance ?? 0).toFixed(2),
    (tx.description || '').slice(0, 120)
  ].join('|');
  return crypto.createHash('sha256').update(key).digest('hex');
}

function reconcileBalances(transactions: any[]) {
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

// Main ETL function
export async function processPDFToDatabase(filePath: string): Promise<{ success: boolean; message: string; count?: number }> {
  try {
    // Parse PDF
    const dataBuffer = fs.readFileSync(filePath);
    const { text } = await pdf(dataBuffer);

    const lines = text.split(/\r?\n/);
    console.log(`[ETL] PDF lines: ${lines.length}`);
    
    const stitched = splitIntoRecords(lines);
    console.log(`[ETL] Stitched records: ${stitched.length}`);
    
    const parsed = stitched.map(parseRow).filter(Boolean);
    console.log(`[ETL] Parsed transactions: ${parsed.length}`);

    if (parsed.length === 0) {
      return { success: false, message: 'PDF\'den hiç işlem parse edilemedi' };
    }

    // Enrich data
    const enriched = parsed.map(r => categorize(enrichCounterparty(r)));
    const withHash = enriched.map(tx => ({ ...tx, id: makeHash(tx), hash: makeHash(tx) }));

    // Quality checks
    const anomalies = reconcileBalances(withHash);
    if (anomalies.length > 0) {
      console.warn(`Bakiye tutarsızlıkları: ${anomalies.length}`);
    }

    // Save to database using Prisma
    const savedCount = await prisma.$transaction(async (tx) => {
      let count = 0;
      for (const item of withHash) {
        try {
          await tx.pDFTransaction.create({
            data: {
              id: item.id,
              dateTime: item.date_time,
              dateTimeIso: item.date_time_iso,
              description: item.description,
              debit: item.debit,
              credit: item.credit,
              amount: item.amount,
              currency: item.currency,
              balance: item.balance,
              balanceCurrency: item.balance_currency,
              operation: item.operation,
              channel: item.channel,
              direction: item.direction,
              counterpartyName: item.counterparty_name,
              counterpartyIban: item.counterparty_iban,
              hash: item.hash,
              raw: item.raw,
              category: item.category,
              tags: item.tags ? JSON.stringify(item.tags) : null
            }
          });
          count++;
        } catch (error: any) {
          // Skip if duplicate (hash constraint)
          if (error.code !== 'P2002') {
            throw error;
          }
        }
      }
      return count;
    });

    return { 
      success: true, 
      message: `${savedCount} işlem başarıyla kaydedildi (${withHash.length - savedCount} tekrar atlandı)`,
      count: savedCount
    };

  } catch (error) {
    console.error('ETL Error:', error);
    return { 
      success: false, 
      message: `PDF işleme hatası: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}` 
    };
  }
}
