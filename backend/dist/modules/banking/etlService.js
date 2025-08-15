"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processPDFToDatabase = processPDFToDatabase;
const fs = __importStar(require("fs"));
const crypto = __importStar(require("crypto"));
const client_1 = require("@prisma/client");
const pdf_parse_1 = __importDefault(require("pdf-parse"));
const prisma = new client_1.PrismaClient();
const DATE_RE = /^\d{2}\/\d{2}\/\d{4}\d{2}:\d{2}:\d{2}/;
const AMOUNT_BLOCK_RE = new RegExp(String.raw `(-?\d{1,3}(?:\.\d{3})*,\d{2})\s*([A-Z]{2,3})?(\d{1,3}(?:\.\d{3})*,\d{2})\s*([A-Z]{2,3})?$`);
function trNumberToFloat(s) {
    return parseFloat(s.replace(/\./g, '').replace(',', '.'));
}
function splitIntoRecords(lines) {
    const rows = [];
    let current = '';
    for (const raw of lines) {
        const line = raw.replace(/\u00a0/g, ' ').trim();
        if (!line)
            continue;
        if (/^\d+\/\d+$/.test(line))
            continue;
        if (line.includes('Tarih Aralığı') || line.includes('Müşteri Adı'))
            continue;
        if (line.includes('Hesap Hareketleri') || line.includes('Yapı ve Kredi Bankası'))
            continue;
        if (DATE_RE.test(line)) {
            if (current)
                rows.push(current.trim());
            current = line;
        }
        else {
            current += ' ' + line;
        }
    }
    if (current)
        rows.push(current.trim());
    return rows;
}
function postProcessDesc(desc) {
    const channel = desc.includes('Internet - Mobil') || desc.includes('Internet  - Mobil') ? 'Internet - Mobil'
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
function parseRow(row) {
    const m = row.match(AMOUNT_BLOCK_RE);
    if (!m)
        return null;
    const amount = trNumberToFloat(m[1]);
    const currency = m[2] || 'TL';
    const balance = trNumberToFloat(m[3]);
    const balanceCurrency = m[4] || currency;
    const head = row.slice(0, m.index).trim();
    const dt = head.match(DATE_RE)?.[0] ?? null;
    if (!dt)
        return null;
    const datePart = dt.substring(0, 10);
    const timePart = dt.substring(10);
    const [dd, mm, yyyy] = datePart.split('/');
    const date_time_iso = `${yyyy}-${mm}-${dd}T${timePart}`;
    const meta = postProcessDesc(head);
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
const RULES = [
    { key: 'fee_bsmv', test: /\bBSMV\b/i },
    { key: 'fee_eft', test: /ELEKTRONİK FON TRANSFERİ.*ÜCRETİ/i },
    { key: 'incoming_fast', test: /\bGELEN\s+FAST\b/i },
    { key: 'outgoing_fast', test: /\bG[İI]DEN\s+FAST\b/i },
    { key: 'incoming_eft', test: /\bGELEN\s+EFT\b/i },
    { key: 'outgoing_eft', test: /\bG[İI]DEN\s+EFT\b/i },
    { key: 'pos_spend', test: /\bPOS\b/i },
    { key: 'invoice', test: /Fatura|ISKI|SU|Elektrik|Doğalgaz/i },
    { key: 'havale_in', test: /\bGELEN\s+HAVALE\b/i },
    { key: 'havale_out', test: /\bG[İI]DEN\s+HAVALE\b/i },
];
function categorize(tx) {
    const text = `${tx.operation || ''} ${tx.direction || ''} ${tx.description || ''}`;
    const tags = RULES.filter(r => r.test.test(text)).map(r => r.key);
    let category = 'other';
    if (tags.includes('incoming_fast') || tags.includes('incoming_eft') || tags.includes('havale_in'))
        category = 'incoming';
    else if (tags.includes('outgoing_fast') || tags.includes('outgoing_eft') || tags.includes('havale_out'))
        category = 'outgoing';
    else if (tags.some(t => t.startsWith('fee')))
        category = 'fee';
    else if (tags.includes('pos_spend'))
        category = 'pos';
    else if (tags.includes('invoice'))
        category = 'invoice';
    return { ...tx, tags, category };
}
const IBAN_RE = /\bTR\d{24}\b/;
const DIR_OP_PREFIX = /(G[İI]DEN|GELEN)\s+(FAST|EFT|HAVALE)\s*-\s*/i;
function extractCounterparty(description) {
    const iban = (description.match(IBAN_RE) || [null])[0];
    let counterparty_name = null;
    const m = description.match(DIR_OP_PREFIX);
    if (m && m.index !== undefined) {
        const rest = description.slice(m.index + m[0].length);
        counterparty_name = rest.split('-')[0].trim();
    }
    else {
        const parts = description.split('-').map(s => s.trim()).filter(Boolean);
        if (parts.length >= 2)
            counterparty_name = parts[1];
    }
    if (counterparty_name && counterparty_name.length < 2)
        counterparty_name = null;
    return { counterparty_name, counterparty_iban: iban };
}
function enrichCounterparty(tx) {
    const { counterparty_name, counterparty_iban } = extractCounterparty(tx.description || '');
    return { ...tx, counterparty_name, counterparty_iban };
}
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
    const sorted = [...transactions].sort((a, b) => a.date_time_iso.localeCompare(b.date_time_iso));
    const anomalies = [];
    for (let i = 1; i < sorted.length; i++) {
        const prev = sorted[i - 1], curr = sorted[i];
        const expected = (prev.balance ?? 0) + (curr.credit ?? 0) - (curr.debit ?? 0);
        if (Math.abs(expected - (curr.balance ?? 0)) > 0.01) {
            anomalies.push({ index: i, prev_balance: prev.balance, expected, actual: curr.balance, tx: curr });
        }
    }
    return anomalies;
}
async function processPDFToDatabase(filePath) {
    try {
        const dataBuffer = fs.readFileSync(filePath);
        const { text } = await (0, pdf_parse_1.default)(dataBuffer);
        const lines = text.split(/\r?\n/);
        console.log(`[ETL] PDF lines: ${lines.length}`);
        const stitched = splitIntoRecords(lines);
        console.log(`[ETL] Stitched records: ${stitched.length}`);
        const parsed = stitched.map(parseRow).filter(Boolean);
        console.log(`[ETL] Parsed transactions: ${parsed.length}`);
        if (parsed.length === 0) {
            return { success: false, message: 'PDF\'den hiç işlem parse edilemedi' };
        }
        const enriched = parsed.map(r => categorize(enrichCounterparty(r)));
        const withHash = enriched.map(tx => ({ ...tx, id: makeHash(tx), hash: makeHash(tx) }));
        const anomalies = reconcileBalances(withHash);
        if (anomalies.length > 0) {
            console.warn(`Bakiye tutarsızlıkları: ${anomalies.length}`);
        }
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
                }
                catch (error) {
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
    }
    catch (error) {
        console.error('ETL Error:', error);
        return {
            success: false,
            message: `PDF işleme hatası: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`
        };
    }
}
//# sourceMappingURL=etlService.js.map