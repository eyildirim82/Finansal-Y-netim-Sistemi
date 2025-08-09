import { logError } from '../../shared/logger';
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import * as ExcelJS from 'exceljs';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

// Utility functions from original parser
const norm = (s: string) =>
  String(s ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase(); 

const HEADER_ALIASES: Record<string, string> = {
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

function canon(label: any): string {
  const key = norm(
    label && label.richText
      ? label.richText.map((p: any) => p.text).join('')
      : label
  );
  return HEADER_ALIASES[key] ?? key;
}

function cellToString(v: any): string {
  if (v == null || v === undefined) return '';
  if (typeof v === 'object') {
    if (Array.isArray(v.richText)) {
      try {
        return v.richText
          .map((rt: any) => (rt && typeof rt === 'object' && rt.text != null ? String(rt.text) : ''))
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

function formatYMD(d: Date) {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${yyyy}-${mm}-${dd}`;
}

function getText(row: ExcelJS.Row, col?: number): string {
  if (!col || col < 1) return '';
  try {
    const cell = row.getCell(col);
    if (cell.value != null) {
      const result = cellToString(cell.value);
      if (result) return result;
    }
    try {
      if (cell.text != null) {
        const result = cellToString(cell.text);
        if (result) return result;
      }
    } catch (textError: any) {
      if (process.env.DEBUG_IMPORT === '1') {
        console.warn(`Text extraction warning for row ${row.number}, col ${col}:`, textError.message);
      }
    }
    try {
      const cellModel = (cell as any).model;
      if (cellModel && cellModel.value != null) {
        const result = cellToString(cellModel.value);
        if (result) return result;
      }
    } catch (modelError: any) {}
    return '';
  } catch (error: any) {
    if (process.env.DEBUG_IMPORT === '1') {
      console.warn(`Cell access error for row ${row.number}, col ${col}:`, error.message);
    }
    return '';
  }
}

function parseTL(input?: string | number): number {
  if (input == null) return 0;
  if (typeof input === 'number') return input;

  const raw = String(input).trim().replace(/\s/g, '');
  if (!raw) return 0;

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

function isTL(s?: string) {
  if (!s) return false;
  const n = s.replace(/\./g, '').replace(',', '.');
  return /^-?\d+(\.\d+)?$/.test(n);
}

function parseDate(s: string): Date {
  if (!s) return new Date();
  
  // Excel date number
  if (typeof s === 'number') {
    const excelDate = new Date((s - 25569) * 86400 * 1000);
    if (!isNaN(excelDate.getTime())) return excelDate;
  }
  
  // DD.MM.YYYY format
  const parts = s.split(/[./-]/);
  if (parts.length === 3) {
    const [d, m, y] = parts.map(Number);
    if (d && m && y) {
      const date = new Date(y, m - 1, d);
      if (!isNaN(date.getTime())) return date;
    }
  }
  
  // Try standard date parsing
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) return parsed;
  
  return new Date();
}

function rowContains(row: ExcelJS.Row, text: string) {
  const want = norm(text);
  const values = Array.isArray(row.values) ? row.values : [];
  return values.some((v: any) => {
    const s = cellToString(v);
    return norm(s).includes(want);
  });
}

function rowIsEmpty(row: ExcelJS.Row) {
  const vs = Array.isArray(row.values) ? row.values : [];
  return vs.every((v: any) => norm(cellToString(v)) === '');
}

function isTxHeaderRow(row: ExcelJS.Row) {
  const vals = Array.isArray(row.values) ? row.values.map(cellToString) : [];
  const normVals = vals.map(canon).filter(v => v && v !== '#');

  const requiredMin = ['belge türü', 'tarih', 'evrak no', 'borç tutar', 'alacak tutar'];
  const ok = requiredMin.every(r => normVals.includes(r));

  if (!ok && process.env.DEBUG_IMPORT === '1') {
    console.log('[DEBUG] isTxHeaderRow normVals:', normVals);
  }
  return ok;
}

function buildTxHeaderMap(row: ExcelJS.Row, map: Record<string, number>) {
  if (!Array.isArray(row.values)) return;
  row.eachCell((cell, col) => {
    const key = canon(cell.value);
    if (key && !(key in map)) {
      map[key] = col;
    }
  });
}

function col(map: Record<string, number>, label: string) {
  return map[canon(label)];
}

function isTotalsRow(row: ExcelJS.Row, map: Record<string, number>) {
  try {
    const docType = getText(row, col(map, 'Belge Türü'));
    const tarih = getText(row, col(map, 'Tarih'));
    const matrah = getText(row, col(map, 'Matrah'));
    const borc = getText(row, col(map, 'Borç Tutar'));
    const alacak = getText(row, col(map, 'Alacak Tutar'));
    const numericPresent = [matrah, borc, alacak].some(val => isTL(val));
    return !docType && !tarih && numericPresent;
  } catch (error: any) {
    console.warn('Warning: Error in isTotalsRow:', error.message);
    return false;
  }
}

function getPairRightOf(row: ExcelJS.Row, label: string) {
  const cells = Array.isArray(row.values) ? row.values as any[] : [];
  const labelNorm = norm(label);
  for (let c = 1; c < cells.length; c++) {
    const left = cellToString(cells[c]);
    if (norm(left) === labelNorm) {
      return cellToString(cells[c + 1]).trim();
    }
  }
  return '';
}

function readCustomerHeader(ws: ExcelJS.Worksheet, startRow: number) {
  let code = '';
  let name = '';
  let phone: string | null = '';
  let address = '';
  let accountType = '';
  let tag1 = '';
  let tag2 = '';
  let reportedTotalDebit = 0;
  let reportedTotalCredit = 0;
  let reportedDebtBalance = 0;
  let reportedCreditBalance = 0;

  // İlk 20 satır ve ilk 10 sütunda başlıkları ara (aralığı genişlettik)
  const maxSearchRows = Math.min(startRow + 20, ws.rowCount);
  const maxSearchCols = 10;

  // Gelişmiş arama fonksiyonu
  const findFieldValue = (searchPatterns: string[], excludePatterns: string[] = []) => {
    for (let r = startRow; r <= maxSearchRows; r++) {
      try {
        const row = ws.getRow(r);
        if (!row || row.cellCount === 0) continue;

        for (let c = 1; c <= maxSearchCols; c++) {
          try {
            const cellVal = getText(row, c);
            if (!cellVal) continue;
            
            const cellNorm = norm(cellVal);
            
            // Arama desenlerini kontrol et
            const matchesPattern = searchPatterns.some(pattern => cellNorm.includes(pattern));
            const excludedByPattern = excludePatterns.some(pattern => cellNorm.includes(pattern));
            
            if (matchesPattern && !excludedByPattern) {
              // Telefon için özel işlem
              if (searchPatterns.some(pattern => pattern.includes('telefon') || pattern.includes('tel') || pattern.includes('gsm') || pattern.includes('cep'))) {
                // Önce sağdaki hücreyi kontrol et
                const rightVal = getText(row, c + 1);
                if (rightVal && rightVal.trim() && validatePhone(rightVal)) {
                  return rightVal.trim();
                }
                
                // Sağdaki hücrede geçerli telefon yoksa, aynı satırda başka bir sütunda telefon numarası ara
                for (let searchCol = 1; searchCol <= Math.min(20, ws.columnCount); searchCol++) {
                  if (searchCol === c || searchCol === c + 1) continue; // Zaten kontrol edilen sütunları atla
                  
                  const searchVal = getText(row, searchCol);
                  if (searchVal && validatePhone(searchVal)) {
                    return searchVal.trim();
                  }
                }
              } else {
                // Telefon dışındaki alanlar için normal işlem
                const rightVal = getText(row, c + 1);
                if (rightVal && rightVal.trim()) {
                  return rightVal.trim();
                }
              }
            }
          } catch (cellError: any) {
            if (process.env.DEBUG_IMPORT === '1') {
              console.warn(`Cell processing error at row ${r}, col ${c}:`, cellError.message);
            }
            continue;
          }
        }
      } catch (rowError: any) {
        if (process.env.DEBUG_IMPORT === '1') {
          console.warn(`Row processing error at row ${r}:`, rowError.message);
        }
        continue;
      }
    }
    return '';
  };

  // Gelişmiş telefon numarası doğrulama
  const validatePhone = (phoneValue: string): string | null => {
    if (!phoneValue || phoneValue === 'Telefon' || phoneValue.length < 5) {
      return null;
    }
    
    // Telefon numarası formatlarını kontrol et
    const phoneRegex = /^[\d\s\-\+\(\)\.]+$/;
    if (!phoneRegex.test(phoneValue)) {
      return null;
    }
    
    // Sadece rakamları say
    const digitCount = phoneValue.replace(/\D/g, '').length;
    if (digitCount < 10 || digitCount > 15) {
      return null;
    }
    
    // Türkiye telefon numarası formatlarını kontrol et
    const cleanPhone = phoneValue.replace(/\D/g, '');
    if (cleanPhone.startsWith('90') && cleanPhone.length === 12) {
      return phoneValue.trim();
    }
    if (cleanPhone.startsWith('0') && cleanPhone.length === 11) {
      return phoneValue.trim();
    }
    if (cleanPhone.length >= 10 && cleanPhone.length <= 11) {
      return phoneValue.trim();
    }
    
    return phoneValue.trim();
  };

  // Gelişmiş müşteri tipi belirleme
  const determineCustomerType = (customerName: string): string => {
    if (!customerName) return 'INDIVIDUAL';
    
    const nameUpper = customerName.toUpperCase();
    
    // Şirket anahtar kelimeleri (genişletilmiş)
    const companyKeywords = [
      'A.Ş.', 'ANONİM ŞİRKETİ', 'LTD.ŞTİ.', 'LİMİTED ŞİRKETİ', 
      'SAN.', 'SANAYİ', 'TİC.', 'TİCARET', 'ŞİRKETİ', 'ŞTİ.',
      'A.Ş', 'LTD', 'LİMİTED', 'SAN', 'TİC', 'KOOPERATİFİ',
      'VAPFI', 'VAKFI', 'DERNEĞİ', 'BİRLİĞİ', 'ODASI',
      'FEDERASYONU', 'KONFEDERASYONU', 'SENDİKASI'
    ];
    
    // Bireysel müşteri göstergeleri
    const individualKeywords = [
      'KİŞİSEL', 'BİREYSEL', 'ŞAHIS', 'KİŞİ', 'BİREY'
    ];
    
    // Önce bireysel kontrolü yap
    if (individualKeywords.some(keyword => nameUpper.includes(keyword))) {
      return 'INDIVIDUAL';
    }
    
    // Şirket kontrolü yap
    if (companyKeywords.some(keyword => nameUpper.includes(keyword))) {
      return 'CORPORATE';
    }
    
    // İsim uzunluğu kontrolü (çok uzun isimler genelde şirket)
    if (customerName.length > 50) {
      return 'CORPORATE';
    }
    
    // Varsayılan olarak bireysel
    return 'INDIVIDUAL';
  };

  // Alanları bul
  code = findFieldValue(['cari kod', 'hesap kod', 'müşteri kod']);
  name = findFieldValue(['cari ad', 'müşteri ad', 'hesap ad', 'firma ad']);
  const phoneValue = findFieldValue(['telefon', 'tel', 'gsm', 'cep']);
  phone = validatePhone(phoneValue);
  address = findFieldValue(['adres', 'adres bilgisi']);
  accountType = findFieldValue(['hesap tür', 'hesap tipi', 'müşteri tipi']);
  tag1 = findFieldValue(['özel kod(1)', 'özel kod 1', 'tag1', 'etiket1']);
  tag2 = findFieldValue(['özel kod(2)', 'özel kod 2', 'tag2', 'etiket2']);
  
  // Bakiye bilgilerini bul
  reportedTotalDebit = parseTL(findFieldValue(['borç'], ['bakiye']));
  reportedTotalCredit = parseTL(findFieldValue(['alacak'], ['bakiye']));
  reportedDebtBalance = parseTL(findFieldValue(['borç bakiye', 'borç bakiyesi']));
  reportedCreditBalance = parseTL(findFieldValue(['alacak bakiye', 'alacak bakiyesi']));

  // İşlem başlığına kadar ilerle
  let nextRow = startRow + 1;
  let headerSearchLimit = 50;
  let searchCount = 0;
  while (nextRow <= ws.rowCount && searchCount < headerSearchLimit) {
    try {
      const row = ws.getRow(nextRow);
      if (isTxHeaderRow(row)) {
        break;
      }
    } catch (error: any) {
      if (process.env.DEBUG_IMPORT === '1') {
        console.warn(`Header search error at row ${nextRow}:`, error.message);
      }
    }
    nextRow++;
    searchCount++;
  }
  
  // Minimum required fields validation
  if (!name && !code) {
    console.warn(`Warning: No customer name or code found starting from row ${startRow}`);
  }
  
  // Müşteri tipini belirle
  const customerType = determineCustomerType(name);
  
  // Debug bilgisi
  if (process.env.DEBUG_IMPORT === '1') {
    console.log(`[DEBUG] Customer header parsed:`, {
      name, code, phone, address, accountType, customerType
    });
  }
  
  return {
    header: {
      code: code || `AUTO_${Date.now()}`,
      name: name || 'Bilinmeyen Müşteri',
      phone: phone || null,
      address: address || null,
      accountType: accountType || null,
      tag1: tag1 || null,
      tag2: tag2 || null,
      type: customerType,
      reportedTotalDebit,
      reportedTotalCredit,
      reportedDebtBalance,
      reportedCreditBalance
    },
    nextRow
  };
}

function parseTxRow(row: ExcelJS.Row, map: Record<string, number>) {
  const t = (k: string) => getText(row, col(map, k));
  const n = (k: string) => parseTL(t(k));
  const dateOrNull = (s?: string) => (s ? parseDate(s) : null);

  let tarihStr = t('Tarih');
  if (!tarihStr) {
    const c = col(map, 'Tarih');
    const v = c ? row.getCell(c).value : undefined;
    if (v instanceof Date) tarihStr = `${String(v.getDate()).padStart(2,'0')}/${String(v.getMonth()+1).padStart(2,'0')}/${v.getFullYear()}`;
  }

  // Açıklama alanını daha esnek oku
  let description = t('Açıklama');
  if (!description || description.trim() === '') {
    // Eğer açıklama sütunu boşsa, diğer sütunlardan açıklama aramaya çalış
    const possibleDescCols = [5, 6, 7, 8, 9, 10];
    for (const col of possibleDescCols) {
      const val = getText(row, col);
      if (val && val.trim() !== '' && !isTL(val)) {
        description = val;
        break;
      }
    }
  }

  return {
    docType: t('Belge Türü') || undefined,
    txnDate: parseDate(tarihStr),
    voucherNo: t('Evrak No') || undefined,
    description: description || undefined,
    dueDate: dateOrNull(t('Vade Tarihi')),
    amountBase: n('Matrah'),
    discount: n('iskonto'),
    amountNet: n('Net Matrah'),
    vat: n('KDV'),
    debit: n('Borç Tutar') || 0,
    credit: n('Alacak Tutar') || 0
  };
}

function sheetHasText(ws: ExcelJS.Worksheet, regex: RegExp): boolean {
  for (let i = 1; i <= ws.rowCount; i++) {
    const row = ws.getRow(i);
    const values = Array.isArray(row.values) ? row.values : [];
    const txt = values.map((v: any) => cellToString(v)).join(' | ').toLowerCase();
    if (regex.test(txt)) return true;
  }
  return false;
}

export class ExtractController {
  // Excel dosyası yükleme ve işleme
  async uploadExcel(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Dosya yüklenmedi' });
      }

      const userId = (req as any).user.id;
      console.log('[DEBUG] Ekstre yükleyen userId:', userId);
      const filePath = req.file.path;

      // Excel dosyasını ExcelJS ile oku
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(filePath);

      // Sheet'i otomatik bul
      const sheet = workbook.worksheets.find(ws => sheetHasText(ws, /cari\s*kodu/i)) ?? workbook.worksheets[0];
      const ws = sheet;

      // Ekstre kaydı oluştur
      const extract = await prisma.extract.create({
        data: {
          fileName: req.file.originalname,
          status: 'processing',
          totalRows: ws.rowCount - 1,
          userId
        }
      });

      // Verileri işle
      const processedData = await this.processExtractData(ws, extract.id, userId);
      
      // Ekstre durumunu güncelle
      await prisma.extract.update({
        where: { id: extract.id },
        data: {
          status: 'completed',
          processedRows: processedData.processedRows,
          errorRows: processedData.errorRows
        }
      });

      // Dosyayı sil
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
    } catch (error) {
      logError('Excel yükleme hatası:', error);
      res.status(500).json({ error: 'Dosya işleme hatası' });
      return;
    }
  }

  // Ekstre verilerini işleme - Orijinal parser mantığı
  private async processExtractData(ws: ExcelJS.Worksheet, extractId: string, userId?: string) {
    let processedRows = 0;
    let errorRows = 0;
    const customers = new Set<string>();

    let i = 2;
    let state: 'SEEK_CUSTOMER'|'SEEK_TX_HEADER'|'READ_TX_ROWS' = 'SEEK_CUSTOMER';
    let currentCustomer: any = null;
    const txHeaderMap: Record<string, number> = {};
    const batch: any[] = [];

    console.log(`[DEBUG] Başlangıç: Toplam satır sayısı: ${ws.rowCount}`);

    while (i <= ws.rowCount) {
      const row = ws.getRow(i);
      console.log(`[DEBUG] Satır ${i}: State=${state}, Row values:`, Array.isArray(row?.values) ? row.values.slice(0, 3) : row?.values);

      if (state === 'SEEK_CUSTOMER') {
        if (
          rowContains(row, 'Cari Kodu') ||
          rowContains(row, 'Cari Adı') ||
          rowContains(row, 'Müşteri') ||
          rowContains(row, 'Hesap Kodu')
        ) {
          console.log(`[DEBUG] Müşteri başlığı bulundu satır ${i}`);
          try {
            const { header, nextRow } = readCustomerHeader(ws, i);
            console.log(`[DEBUG] Müşteri header:`, header);
            i = nextRow;
            // Müşteriyi bul veya oluştur
            const customer = await this.findOrCreateCustomer(header, userId);
            
            // FAKTORİNG müşterisi ise atla
            if (!customer) {
              console.log(`[DEBUG] FAKTORİNG müşterisi atlandı, yeni müşteri aranıyor`);
              i++;
              continue;
            }
            
            currentCustomer = customer;
            customers.add(customer.name);
            console.log(`[DEBUG] Müşteri oluşturuldu/bulundu: ${customer.name}`);
            state = 'SEEK_TX_HEADER';
            continue;
          } catch (error) {
            logError(`Müşteri header işleme hatası (Satır ${i}):`, error);
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
          logError('Müşteri context kayboldu', new Error('Customer context lost'));
          errorRows++;
          i++;
          continue;
        }

        try {
          const txr = parseTxRow(row, txHeaderMap);
          console.log(`[DEBUG] İşlem parse edildi satır ${i}:`, txr);
          // Bozuk satırları ele
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
          // İşlem kaydını batch'e ekle
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
        } catch (error) {
          logError(`Satır ${i + 1} işleme hatası:`, error);
          errorRows++;
        }
        i++;
      }
    }

          // Yeni işlemleri filtrele ve sadece yeni olanları ekle
      if (batch.length > 0) {
        try {
          const newTransactions = await this.filterNewTransactions(batch);
          
          if (newTransactions.length > 0) {
            await prisma.extractTransaction.createMany({ data: newTransactions });
            console.log(`[DEBUG] Yeni işlemler eklendi. Toplam: ${newTransactions.length}`);
            
            // Bakiye hesaplama ve güncelleme (sadece yeni işlemler için)
            await this.updateCustomerBalances(newTransactions);
          } else {
            console.log('[DEBUG] Yeni işlem bulunamadı, hiçbir şey eklenmedi');
          }
          
        } catch (err) {
          logError('Batch insert hatası:', err);
          errorRows += batch.length;
        }
      }

      return { processedRows, errorRows, customers: Array.from(customers) };
  }

  // Müşteriyi bul veya oluştur
  private async findOrCreateCustomer(header: any, userId?: string): Promise<any> {
    if (!header.name) return null;

    console.log('[DEBUG] Müşteri ekleniyor, userId:', userId, 'name:', header.name);
    
    // FAKTORİNG müşterilerini filtrele
    if (header.name.toUpperCase().includes('FAKTORİNG')) {
      console.log('[DEBUG] FAKTORİNG müşterisi atlandı:', header.name);
      return null;
    }
    
    // Önce isimle ara
    let customer = await prisma.customer.findFirst({
      where: { name: header.name, userId }
    });

    // Eğer bulunamazsa, koda göre ara
    if (!customer && header.code) {
      customer = await prisma.customer.findFirst({
        where: { code: header.code, userId }
      });
    }

    if (!customer) {
      // Veri doğrulama ve temizleme
      const cleanData: any = {
        code: header.code || this.generateCustomerCode(header.name),
        name: header.name.trim(),
        originalName: header.name.trim(),
        phone: header.phone || null,
        address: header.address ? header.address.trim() : null,
        accountType: header.accountType ? header.accountType.trim() : null,
        tag1: header.tag1 ? header.tag1.trim() : null,
        tag2: header.tag2 ? header.tag2.trim() : null,
        type: header.type || 'INDIVIDUAL'
      };

      // Null değerleri temizle
      Object.keys(cleanData).forEach(key => {
        if (cleanData[key] === '') {
          cleanData[key] = null;
        }
      });

      if (userId) cleanData.userId = userId;

      console.log('[DEBUG] Yeni müşteri oluşturuluyor:', cleanData);
      
      customer = await prisma.customer.create({
        data: cleanData
      });
      
      console.log('[DEBUG] Müşteri oluşturuldu:', customer.id);
    } else {
      console.log('[DEBUG] Mevcut müşteri bulundu:', customer.id);
    }

    return customer;
  }

  // Müşteri kodu oluştur
  private generateCustomerCode(name: string): string {
    const cleanName = name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const timestamp = Date.now().toString().slice(-4);
    return `${cleanName.slice(0, 6)}${timestamp}`;
  }

  // İşlem eşleştirme ve sadece yeni işlemleri ekleme
  private async filterNewTransactions(transactions: any[]): Promise<any[]> {
    try {
      console.log('[DEBUG] Yeni işlemleri filtreleme başlıyor...');
      const newTransactions: any[] = [];
      
      for (const transaction of transactions) {
        // İşlemi benzersiz tanımlamak için kriterler
        const uniqueKey = this.generateTransactionKey(transaction);
        
        // Mevcut işlemleri kontrol et
        const existingTransaction = await prisma.extractTransaction.findFirst({
          where: {
            customerId: transaction.customerId,
            voucherNo: transaction.voucherNo,
            date: transaction.date,
            debit: transaction.debit,
            credit: transaction.credit,
            description: transaction.description
          }
        });
        
        if (!existingTransaction) {
          // Yeni işlem, listeye ekle
          newTransactions.push(transaction);
          console.log(`[DEBUG] Yeni işlem bulundu: ${transaction.description} (${transaction.voucherNo})`);
        } else {
          console.log(`[DEBUG] Mevcut işlem atlandı: ${transaction.description} (${transaction.voucherNo})`);
        }
      }
      
      console.log(`[DEBUG] Toplam ${transactions.length} işlemden ${newTransactions.length} tanesi yeni`);
      return newTransactions;
    } catch (error) {
      logError('İşlem filtreleme hatası:', error);
      return transactions; // Hata durumunda tüm işlemleri döndür
    }
  }

  // İşlem için benzersiz anahtar oluşturma
  private generateTransactionKey(transaction: any): string {
    return `${transaction.customerId}_${transaction.voucherNo}_${transaction.date.toISOString()}_${transaction.debit}_${transaction.credit}_${transaction.description}`;
  }



  // Müşteri bakiyelerini güncelleme
  private async updateCustomerBalances(transactions: any[]) {
    try {
      console.log('[DEBUG] Bakiye güncelleme başlıyor...');
      
      // Müşteri bazında işlemleri grupla
      const customerTransactions = new Map();
      
      for (const transaction of transactions) {
        const customerId = transaction.customerId;
        if (!customerTransactions.has(customerId)) {
          customerTransactions.set(customerId, []);
        }
        customerTransactions.get(customerId).push(transaction);
      }
      
      // Her müşteri için bakiye hesapla ve güncelle
      for (const [customerId, customerTxs] of customerTransactions) {
        let totalDebit = 0;
        let totalCredit = 0;
        
        // Bu batch'teki işlemleri topla
        for (const tx of customerTxs) {
          totalDebit += tx.debit || 0;
          totalCredit += tx.credit || 0;
        }
        
        // Mevcut bakiyeyi al
        const existingBalance = await prisma.balance.findUnique({
          where: { customerId }
        });
        
        if (existingBalance) {
          // Mevcut bakiyeyi güncelle
          await prisma.balance.update({
            where: { customerId },
            data: {
              totalDebit: existingBalance.totalDebit + totalDebit,
              totalCredit: existingBalance.totalCredit + totalCredit,
              netBalance: (existingBalance.totalCredit + totalCredit) - (existingBalance.totalDebit + totalDebit),
              lastUpdated: new Date()
            }
          });
          console.log(`[DEBUG] Müşteri ${customerId} bakiyesi güncellendi`);
        } else {
          // Yeni bakiye kaydı oluştur
          await prisma.balance.create({
            data: {
              customerId,
              totalDebit,
              totalCredit,
              netBalance: totalCredit - totalDebit,
              lastUpdated: new Date()
            }
          });
          console.log(`[DEBUG] Müşteri ${customerId} için yeni bakiye oluşturuldu`);
        }
      }
      
      console.log(`[DEBUG] ${customerTransactions.size} müşteri bakiyesi güncellendi`);
    } catch (error) {
      logError('Bakiye güncelleme hatası:', error);
    }
  }

  // Ekstre listesi
  async getExtracts(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      
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
    } catch (error) {
      logError('Ekstre listesi hatası:', error);
      res.status(500).json({ error: 'Ekstre listesi alınamadı' });
    }
  }

  // Ekstre detayı
  async getExtractDetail(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = (req as any).user.id;
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
    } catch (error) {
      logError('Ekstre detay hatası:', error);
      return res.status(500).json({ error: 'Ekstre detayı alınamadı' });
    }
  }

  // Bakiye doğrulama
  async validateBalances(req: Request, res: Response) {
    try {
      const { extractId } = req.params;
      const userId = (req as any).user.id;
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
    } catch (error) {
      logError('Bakiye doğrulama hatası:', error);
      return res.status(500).json({ error: 'Bakiye doğrulama yapılamadı' });
    }
  }

  private async calculateBalances(transactions: any[]) {
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

  // Eski ekstreleri silme
  async deleteOldExtracts(req: Request, res: Response) {
    try {
      const { beforeDate, deleteAll } = req.body;
      const userId = (req as any).user.id;

      let whereClause: any = { userId };

      if (deleteAll) {
        // Tüm ekstreleri sil
        whereClause = { userId };
      } else if (beforeDate) {
        // Belirli tarihten önceki ekstreleri sil
        whereClause = {
          userId,
          createdAt: {
            lt: new Date(beforeDate)
          }
        };
      } else {
        return res.status(400).json({ 
          error: 'beforeDate veya deleteAll parametresi gerekli' 
        });
      }

      // Önce ekstre ID'lerini al
      const extracts = await prisma.extract.findMany({
        where: whereClause,
        select: { id: true }
      });

      const extractIds = extracts.map(e => e.id);

      if (extractIds.length === 0) {
        return res.json({
          success: true,
          message: 'Silinecek ekstre bulunamadı',
          deletedCount: 0
        });
      }

      // İşlemleri sil
      await prisma.extractTransaction.deleteMany({
        where: {
          extractId: {
            in: extractIds
          }
        }
      });

      // Ekstreleri sil
      await prisma.extract.deleteMany({
        where: whereClause
      });

      return res.json({
        success: true,
        message: `${extractIds.length} ekstre başarıyla silindi`,
        deletedCount: extractIds.length
      });

    } catch (error) {
      logError('Eski ekstreleri silme hatası:', error);
      return res.status(500).json({ error: 'Ekstreler silinirken hata oluştu' });
    }
  }

  // Belirli bir ekstreyi silme
  async deleteExtract(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = (req as any).user.id;

      // Ekstre kullanıcıya ait mi kontrol et
      const extract = await prisma.extract.findFirst({
        where: { id, userId }
      });

      if (!extract) {
        return res.status(404).json({ error: 'Ekstre bulunamadı' });
      }

      // İşlemleri sil
      await prisma.extractTransaction.deleteMany({
        where: { extractId: id }
      });

      // Ekstreyi sil
      await prisma.extract.delete({
        where: { id }
      });

      return res.json({
        success: true,
        message: 'Ekstre başarıyla silindi'
      });

    } catch (error) {
      logError('Ekstre silme hatası:', error);
      return res.status(500).json({ error: 'Ekstre silinirken hata oluştu' });
    }
  }
} 