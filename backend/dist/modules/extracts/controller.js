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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExtractController = void 0;
const logger_1 = require("@/shared/logger");
const client_1 = require("@prisma/client");
const ExcelJS = __importStar(require("exceljs"));
const fs = __importStar(require("fs"));
const prisma = new client_1.PrismaClient();
const norm = (s) => String(s ?? '')
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
    const key = norm(label && label.richText
        ? label.richText.map((p) => p.text).join('')
        : label);
    return HEADER_ALIASES[key] ?? key;
}
function cellToString(v) {
    if (v == null || v === undefined)
        return '';
    if (typeof v === 'object') {
        if (Array.isArray(v.richText)) {
            try {
                return v.richText
                    .map((rt) => (rt && typeof rt === 'object' && rt.text != null ? String(rt.text) : ''))
                    .join('')
                    .trim();
            }
            catch {
                return '';
            }
        }
        if ('text' in v && v.text != null) {
            try {
                return String(v.text).trim();
            }
            catch {
                return '';
            }
        }
        if (v instanceof Date)
            return v.toLocaleDateString('tr-TR');
        if (typeof v === 'number')
            return String(v);
        if (typeof v === 'object' && v !== null && typeof v.toString === 'function') {
            try {
                const str = v.toString();
                if (typeof str === 'string' && str !== '[object Object]' && str !== 'null' && str !== 'undefined') {
                    return str.trim();
                }
            }
            catch {
                return '';
            }
        }
        if ('value' in v && v.value != null) {
            return cellToString(v.value);
        }
        return '';
    }
    if (typeof v === 'string')
        return v.trim();
    if (typeof v === 'number')
        return String(v);
    if (typeof v === 'boolean')
        return String(v);
    try {
        return String(v).trim();
    }
    catch {
        return '';
    }
}
function formatYMD(d) {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${yyyy}-${mm}-${dd}`;
}
function getText(row, col) {
    if (!col || col < 1)
        return '';
    try {
        const cell = row.getCell(col);
        if (cell.value != null) {
            const result = cellToString(cell.value);
            if (result)
                return result;
        }
        try {
            if (cell.text != null) {
                const result = cellToString(cell.text);
                if (result)
                    return result;
            }
        }
        catch (textError) {
            if (process.env.DEBUG_IMPORT === '1') {
                console.warn(`Text extraction warning for row ${row.number}, col ${col}:`, textError.message);
            }
        }
        try {
            const cellModel = cell.model;
            if (cellModel && cellModel.value != null) {
                const result = cellToString(cellModel.value);
                if (result)
                    return result;
            }
        }
        catch (modelError) { }
        return '';
    }
    catch (error) {
        if (process.env.DEBUG_IMPORT === '1') {
            console.warn(`Cell access error for row ${row.number}, col ${col}:`, error.message);
        }
        return '';
    }
}
function parseTL(input) {
    if (input == null)
        return 0;
    if (typeof input === 'number')
        return input;
    const raw = String(input).trim().replace(/\s/g, '');
    if (!raw)
        return 0;
    const hasComma = raw.includes(',');
    const hasDot = raw.includes('.');
    if (hasComma && hasDot) {
        const norm = raw.replace(/\./g, '').replace(',', '.');
        const n = Number(norm);
        return isNaN(n) ? 0 : n;
    }
    if (hasComma && !hasDot) {
        const n = Number(raw.replace(',', '.'));
        return isNaN(n) ? 0 : n;
    }
    const dotCount = (raw.match(/\./g) || []).length;
    if (dotCount > 1) {
        const parts = raw.split('.');
        const last = parts.pop();
        const norm = parts.join('') + (last ? '.' + last : '');
        const n = Number(norm);
        return isNaN(n) ? 0 : n;
    }
    const n = Number(raw);
    return isNaN(n) ? 0 : n;
}
function isTL(s) {
    if (!s)
        return false;
    const n = s.replace(/\./g, '').replace(',', '.');
    return /^-?\d+(\.\d+)?$/.test(n);
}
function parseDate(s) {
    if (!s)
        return new Date();
    if (typeof s === 'number') {
        const excelDate = new Date((s - 25569) * 86400 * 1000);
        if (!isNaN(excelDate.getTime()))
            return excelDate;
    }
    const parts = s.split(/[./-]/);
    if (parts.length === 3) {
        const [d, m, y] = parts.map(Number);
        if (d && m && y) {
            const date = new Date(y, m - 1, d);
            if (!isNaN(date.getTime()))
                return date;
        }
    }
    const parsed = new Date(s);
    if (!isNaN(parsed.getTime()))
        return parsed;
    return new Date();
}
function rowContains(row, text) {
    const want = norm(text);
    const values = Array.isArray(row.values) ? row.values : [];
    return values.some((v) => {
        const s = cellToString(v);
        return norm(s).includes(want);
    });
}
function rowIsEmpty(row) {
    const vs = Array.isArray(row.values) ? row.values : [];
    return vs.every((v) => norm(cellToString(v)) === '');
}
function isTxHeaderRow(row) {
    const vals = Array.isArray(row.values) ? row.values.map(cellToString) : [];
    const normVals = vals.map(canon).filter(v => v && v !== '#');
    const requiredMin = ['belge türü', 'tarih', 'evrak no', 'borç tutar', 'alacak tutar'];
    const ok = requiredMin.every(r => normVals.includes(r));
    if (!ok && process.env.DEBUG_IMPORT === '1') {
        console.log('[DEBUG] isTxHeaderRow normVals:', normVals);
    }
    return ok;
}
function buildTxHeaderMap(row, map) {
    if (!Array.isArray(row.values))
        return;
    row.eachCell((cell, col) => {
        const key = canon(cell.value);
        if (key && !(key in map)) {
            map[key] = col;
        }
    });
}
function col(map, label) {
    return map[canon(label)];
}
function isTotalsRow(row, map) {
    try {
        const docType = getText(row, col(map, 'Belge Türü'));
        const tarih = getText(row, col(map, 'Tarih'));
        const matrah = getText(row, col(map, 'Matrah'));
        const borc = getText(row, col(map, 'Borç Tutar'));
        const alacak = getText(row, col(map, 'Alacak Tutar'));
        const numericPresent = [matrah, borc, alacak].some(val => isTL(val));
        return !docType && !tarih && numericPresent;
    }
    catch (error) {
        console.warn('Warning: Error in isTotalsRow:', error.message);
        return false;
    }
}
function getPairRightOf(row, label) {
    const cells = Array.isArray(row.values) ? row.values : [];
    const labelNorm = norm(label);
    for (let c = 1; c < cells.length; c++) {
        const left = cellToString(cells[c]);
        if (norm(left) === labelNorm) {
            return cellToString(cells[c + 1]).trim();
        }
    }
    return '';
}
function readCustomerHeader(ws, startRow) {
    let code = '';
    let name = '';
    let phone = '';
    let address = '';
    let accountType = '';
    let tag1 = '';
    let tag2 = '';
    let reportedTotalDebit = 0;
    let reportedTotalCredit = 0;
    let reportedDebtBalance = 0;
    let reportedCreditBalance = 0;
    const maxSearchRows = Math.min(startRow + 15, ws.rowCount);
    const maxSearchCols = 8;
    for (let r = startRow; r <= maxSearchRows; r++) {
        try {
            const row = ws.getRow(r);
            if (!row || row.cellCount === 0)
                continue;
            for (let c = 1; c <= maxSearchCols; c++) {
                try {
                    const cellVal = getText(row, c);
                    const rightVal = getText(row, c + 1);
                    if (!cellVal)
                        continue;
                    const cellNorm = norm(cellVal);
                    if (cellNorm.includes('cari') && cellNorm.includes('kod') && !code) {
                        code = rightVal;
                    }
                    else if ((cellNorm.includes('cari') && cellNorm.includes('ad')) ||
                        (cellNorm.includes('müşteri') && cellNorm.includes('ad')) && !name) {
                        name = rightVal;
                    }
                    else if (cellNorm.includes('telefon') && !phone) {
                        phone = rightVal;
                    }
                    else if (cellNorm.includes('adres') && !address) {
                        address = rightVal;
                    }
                    else if (cellNorm.includes('hesap') && cellNorm.includes('tür') && !accountType) {
                        accountType = rightVal;
                    }
                    else if (cellNorm.includes('özel') && cellNorm.includes('kod') && cellNorm.includes('1') && !tag1) {
                        tag1 = rightVal;
                    }
                    else if (cellNorm.includes('özel') && cellNorm.includes('kod') && cellNorm.includes('2') && !tag2) {
                        tag2 = rightVal;
                    }
                    else if (cellNorm.includes('borç') && !cellNorm.includes('bakiye') && reportedTotalDebit === 0) {
                        reportedTotalDebit = parseTL(rightVal);
                    }
                    else if (cellNorm.includes('alacak') && !cellNorm.includes('bakiye') && reportedTotalCredit === 0) {
                        reportedTotalCredit = parseTL(rightVal);
                    }
                    else if (cellNorm.includes('borç') && cellNorm.includes('bakiye') && reportedDebtBalance === 0) {
                        reportedDebtBalance = parseTL(rightVal);
                    }
                    else if (cellNorm.includes('alacak') && cellNorm.includes('bakiye') && reportedCreditBalance === 0) {
                        reportedCreditBalance = parseTL(rightVal);
                    }
                }
                catch (cellError) {
                    if (process.env.DEBUG_IMPORT === '1') {
                        console.warn(`Cell processing error at row ${r}, col ${c}:`, cellError.message);
                    }
                    continue;
                }
            }
        }
        catch (rowError) {
            if (process.env.DEBUG_IMPORT === '1') {
                console.warn(`Row processing error at row ${r}:`, rowError.message);
            }
            continue;
        }
    }
    let nextRow = startRow + 1;
    let headerSearchLimit = 50;
    let searchCount = 0;
    while (nextRow <= ws.rowCount && searchCount < headerSearchLimit) {
        try {
            const row = ws.getRow(nextRow);
            if (isTxHeaderRow(row)) {
                break;
            }
        }
        catch (error) {
            if (process.env.DEBUG_IMPORT === '1') {
                console.warn(`Header search error at row ${nextRow}:`, error.message);
            }
        }
        nextRow++;
        searchCount++;
    }
    if (!name && !code) {
        console.warn(`Warning: No customer name or code found starting from row ${startRow}`);
    }
    return {
        header: {
            code: code || `AUTO_${Date.now()}`,
            name: name || 'Bilinmeyen Müşteri',
            phone,
            address,
            accountType,
            tag1,
            tag2,
            reportedTotalDebit,
            reportedTotalCredit,
            reportedDebtBalance,
            reportedCreditBalance
        },
        nextRow
    };
}
function parseTxRow(row, map) {
    const t = (k) => getText(row, col(map, k));
    const n = (k) => parseTL(t(k));
    const dateOrNull = (s) => (s ? parseDate(s) : null);
    let tarihStr = t('Tarih');
    if (!tarihStr) {
        const c = col(map, 'Tarih');
        const v = c ? row.getCell(c).value : undefined;
        if (v instanceof Date)
            tarihStr = `${String(v.getDate()).padStart(2, '0')}/${String(v.getMonth() + 1).padStart(2, '0')}/${v.getFullYear()}`;
    }
    return {
        docType: t('Belge Türü') || undefined,
        txnDate: parseDate(tarihStr),
        voucherNo: t('Evrak No') || undefined,
        description: t('Açıklama') || undefined,
        dueDate: dateOrNull(t('Vade Tarihi')),
        amountBase: n('Matrah'),
        discount: n('iskonto'),
        amountNet: n('Net Matrah'),
        vat: n('KDV'),
        debit: n('Borç Tutar') || 0,
        credit: n('Alacak Tutar') || 0
    };
}
function sheetHasText(ws, regex) {
    for (let i = 1; i <= ws.rowCount; i++) {
        const row = ws.getRow(i);
        const values = Array.isArray(row.values) ? row.values : [];
        const txt = values.map((v) => cellToString(v)).join(' | ').toLowerCase();
        if (regex.test(txt))
            return true;
    }
    return false;
}
class ExtractController {
    async uploadExcel(req, res) {
        try {
            if (!req.file) {
                return res.status(400).json({ error: 'Dosya yüklenmedi' });
            }
            const userId = req.user.id;
            const filePath = req.file.path;
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.readFile(filePath);
            const sheet = workbook.worksheets.find(ws => sheetHasText(ws, /cari\s*kodu/i)) ?? workbook.worksheets[0];
            const ws = sheet;
            const extract = await prisma.extract.create({
                data: {
                    fileName: req.file.originalname,
                    status: 'processing',
                    totalRows: ws.rowCount - 1,
                    userId
                }
            });
            const processedData = await this.processExtractData(ws, extract.id, userId);
            await prisma.extract.update({
                where: { id: extract.id },
                data: {
                    status: 'completed',
                    processedRows: processedData.processedRows,
                    errorRows: processedData.errorRows
                }
            });
            fs.unlinkSync(filePath);
            res.json({
                success: true,
                extractId: extract.id,
                totalRows: ws.rowCount - 1,
                processedRows: processedData.processedRows,
                errorRows: processedData.errorRows,
                customers: processedData.customers
            });
            return;
        }
        catch (error) {
            (0, logger_1.logError)('Excel yükleme hatası:', error);
            res.status(500).json({ error: 'Dosya işleme hatası' });
            return;
        }
    }
    async processExtractData(ws, extractId, userId) {
        let processedRows = 0;
        let errorRows = 0;
        const customers = new Set();
        let i = 2;
        let state = 'SEEK_CUSTOMER';
        let currentCustomer = null;
        const txHeaderMap = {};
        const batch = [];
        console.log(`[DEBUG] Başlangıç: Toplam satır sayısı: ${ws.rowCount}`);
        while (i <= ws.rowCount) {
            const row = ws.getRow(i);
            console.log(`[DEBUG] Satır ${i}: State=${state}, Row values:`, Array.isArray(row?.values) ? row.values.slice(0, 3) : row?.values);
            if (state === 'SEEK_CUSTOMER') {
                if (rowContains(row, 'Cari Kodu') ||
                    rowContains(row, 'Cari Adı') ||
                    rowContains(row, 'Müşteri') ||
                    rowContains(row, 'Hesap Kodu')) {
                    console.log(`[DEBUG] Müşteri başlığı bulundu satır ${i}`);
                    try {
                        const { header, nextRow } = readCustomerHeader(ws, i);
                        console.log(`[DEBUG] Müşteri header:`, header);
                        i = nextRow;
                        const customer = await this.findOrCreateCustomer(header, userId);
                        currentCustomer = customer;
                        customers.add(customer.name);
                        console.log(`[DEBUG] Müşteri oluşturuldu/bulundu: ${customer.name}`);
                        state = 'SEEK_TX_HEADER';
                        continue;
                    }
                    catch (error) {
                        (0, logger_1.logError)(`Müşteri header işleme hatası (Satır ${i}):`, error);
                        errorRows++;
                        i++;
                        continue;
                    }
                }
                i++;
            }
            else if (state === 'SEEK_TX_HEADER') {
                if (isTxHeaderRow(row)) {
                    console.log(`[DEBUG] İşlem başlığı bulundu satır ${i}`);
                    buildTxHeaderMap(row, txHeaderMap);
                    console.log('[DEBUG] txHeaderMap:', txHeaderMap);
                    i++;
                    state = 'READ_TX_ROWS';
                    continue;
                }
                i++;
            }
            else if (state === 'READ_TX_ROWS') {
                if (rowContains(row, 'Cari Kodu')) {
                    console.log(`[DEBUG] Yeni müşteri başlangıcı, state değişiyor`);
                    state = 'SEEK_CUSTOMER';
                    continue;
                }
                if (isTotalsRow(row, txHeaderMap)) {
                    console.log(`[DEBUG] Toplam satırı atlanıyor satır ${i}`);
                    i++;
                    continue;
                }
                if (rowIsEmpty(row)) {
                    console.log(`[DEBUG] Boş satır atlanıyor satır ${i}`);
                    i++;
                    continue;
                }
                if (!currentCustomer) {
                    (0, logger_1.logError)('Müşteri context kayboldu', new Error('Customer context lost'));
                    errorRows++;
                    i++;
                    continue;
                }
                try {
                    const txr = parseTxRow(row, txHeaderMap);
                    console.log(`[DEBUG] İşlem parse edildi satır ${i}:`, txr);
                    if (!txr.txnDate || isNaN(txr.txnDate.getTime())) {
                        console.log(`[DEBUG] Geçersiz tarih, satır atlanıyor ${i}`);
                        i++;
                        continue;
                    }
                    if ((txr.debit ?? 0) === 0 && (txr.credit ?? 0) === 0) {
                        console.log(`[DEBUG] Sıfır tutar, satır atlanıyor ${i}`);
                        i++;
                        continue;
                    }
                    batch.push({
                        extractId,
                        customerId: currentCustomer.id,
                        date: txr.txnDate,
                        description: txr.description || '',
                        debit: txr.debit || 0,
                        credit: txr.credit || 0,
                        documentType: txr.docType,
                        voucherNo: txr.voucherNo,
                        dueDate: txr.dueDate,
                        amountBase: txr.amountBase || 0,
                        discount: txr.discount || 0,
                        amountNet: txr.amountNet || 0,
                        vat: txr.vat || 0,
                        sourceRow: i + 1
                    });
                    processedRows++;
                    console.log(`[DEBUG] Batch'e eklendi. Toplam batch: ${batch.length}`);
                }
                catch (error) {
                    (0, logger_1.logError)(`Satır ${i + 1} işleme hatası:`, error);
                    errorRows++;
                }
                i++;
            }
        }
        if (batch.length > 0) {
            try {
                await prisma.extractTransaction.createMany({ data: batch });
                console.log(`[DEBUG] Batch insert tamamlandı. Toplam: ${batch.length}`);
            }
            catch (err) {
                (0, logger_1.logError)('Batch insert hatası:', err);
                errorRows += batch.length;
            }
        }
        return { processedRows, errorRows, customers: Array.from(customers) };
    }
    async findOrCreateCustomer(header, userId) {
        if (!header.name)
            return null;
        let customer = await prisma.customer.findFirst({
            where: { name: header.name, userId }
        });
        if (!customer) {
            const data = {
                code: this.generateCustomerCode(header.name),
                name: header.name,
                originalName: header.name,
                phone: header.phone,
                address: header.address,
                accountType: header.accountType,
                tag1: header.tag1,
                tag2: header.tag2
            };
            if (userId)
                data.userId = userId;
            customer = await prisma.customer.create({
                data
            });
        }
        return customer;
    }
    generateCustomerCode(name) {
        const cleanName = name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        const timestamp = Date.now().toString().slice(-4);
        return `${cleanName.slice(0, 6)}${timestamp}`;
    }
    async getExtracts(req, res) {
        try {
            const userId = req.user.id;
            const extracts = await prisma.extract.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                include: {
                    _count: {
                        select: { transactions: true }
                    }
                }
            });
            res.json(extracts);
        }
        catch (error) {
            (0, logger_1.logError)('Ekstre listesi hatası:', error);
            res.status(500).json({ error: 'Ekstre listesi alınamadı' });
        }
    }
    async getExtractDetail(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;
            const extract = await prisma.extract.findFirst({
                where: { id, userId },
                include: {
                    transactions: {
                        include: { customer: true },
                        orderBy: { date: 'desc' }
                    }
                }
            });
            if (!extract) {
                return res.status(404).json({ error: 'Ekstre bulunamadı' });
            }
            return res.json(extract);
        }
        catch (error) {
            (0, logger_1.logError)('Ekstre detay hatası:', error);
            return res.status(500).json({ error: 'Ekstre detayı alınamadı' });
        }
    }
    async validateBalances(req, res) {
        try {
            const { extractId } = req.params;
            const userId = req.user.id;
            const extract = await prisma.extract.findFirst({
                where: { id: extractId, userId },
                include: {
                    transactions: { include: { customer: true } }
                }
            });
            if (!extract) {
                return res.status(404).json({ error: 'Ekstre bulunamadı' });
            }
            const balanceValidation = await this.calculateBalances(extract.transactions);
            return res.json({
                extractId,
                balanceValidation,
                summary: {
                    totalCustomers: balanceValidation.length,
                    matchedBalances: balanceValidation.filter(b => b.isMatched).length,
                    unmatchedBalances: balanceValidation.filter(b => !b.isMatched).length
                }
            });
        }
        catch (error) {
            (0, logger_1.logError)('Bakiye doğrulama hatası:', error);
            return res.status(500).json({ error: 'Bakiye doğrulama yapılamadı' });
        }
    }
    async calculateBalances(transactions) {
        const customerBalances = new Map();
        for (const transaction of transactions) {
            const customerId = transaction.customerId;
            if (!customerBalances.has(customerId)) {
                customerBalances.set(customerId, {
                    customerId,
                    customerName: transaction.customer.name,
                    totalDebit: 0,
                    totalCredit: 0,
                    netBalance: 0,
                    transactionCount: 0
                });
            }
            const balance = customerBalances.get(customerId);
            balance.totalDebit += transaction.debit;
            balance.totalCredit += transaction.credit;
            balance.netBalance = balance.totalCredit - balance.totalDebit;
            balance.transactionCount++;
        }
        const validationResults = [];
        for (const [customerId, balance] of customerBalances) {
            const customer = await prisma.customer.findUnique({
                where: { id: customerId },
                include: { balance: true }
            });
            const expectedBalance = customer?.balance?.netBalance || 0;
            const isMatched = Math.abs(balance.netBalance - expectedBalance) < 0.01;
            validationResults.push({
                ...balance,
                expectedBalance,
                difference: balance.netBalance - expectedBalance,
                isMatched
            });
        }
        return validationResults;
    }
}
exports.ExtractController = ExtractController;
//# sourceMappingURL=controller.js.map