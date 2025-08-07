import { logError } from '@/shared/logger';
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';
import csv from 'csv-parser';
import { createReadStream } from 'fs';
import { validationResult } from 'express-validator';
import path from 'path';

const prisma = new PrismaClient();

export class ImportController {
  // Excel dosyası yükleme ve işleme
  static async importExcel(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Dosya yüklenmedi'
        });
      }

      const userId = (req as any).user.id;
      const filePath = req.file.path;
      const fileExtension = path.extname(req.file.originalname).toLowerCase();

      if (!['.xlsx', '.xls'].includes(fileExtension)) {
        return res.status(400).json({
          success: false,
          message: 'Sadece Excel dosyaları (.xlsx, .xls) desteklenir'
        });
      }

      // Excel dosyasını oku
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      if (data.length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Dosya boş veya geçersiz format'
        });
      }

      // Başlık satırını al
      const headers = data[0] as string[];
      const rows = data.slice(1) as any[][];

      // Gerekli sütunları kontrol et
      const requiredColumns = ['type', 'amount', 'description', 'date'];
      const missingColumns = requiredColumns.filter(col => !headers.includes(col));

      if (missingColumns.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Eksik sütunlar: ${missingColumns.join(', ')}`
        });
      }

      // Veri doğrulama ve işleme
      const processedData = [];
      const errors = [];
      const warnings = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowData: any = {};

        // Sütunları eşleştir
        headers.forEach((header, index) => {
          rowData[header] = row[index];
        });

        // Veri doğrulama
        const validationResult = ImportController.validateTransactionData(rowData, i + 2);
        
        if (validationResult.isValid) {
          processedData.push(validationResult.data);
        } else {
          errors.push({
            row: i + 2,
            errors: validationResult.errors
          });
        }

        if (validationResult.warnings.length > 0) {
          warnings.push({
            row: i + 2,
            warnings: validationResult.warnings
          });
        }
      }

      // Hata varsa işlemi durdur
      if (errors.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Dosyada hatalar bulundu',
          errors,
          warnings
        });
      }

      // Veritabanına kaydet
      const savedTransactions = [];
      for (const transactionData of processedData) {
        try {
          const transaction = await prisma.transaction.create({
            data: {
              ...transactionData,
              userId
            },
            include: {
              customer: {
                select: {
                  id: true,
                  name: true,
                  code: true
                }
              },
              category: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          });
          savedTransactions.push(transaction);
        } catch (error) {
          errors.push({
            row: transactionData.rowNumber,
            errors: ['Veritabanına kaydedilemedi']
          });
        }
      }

      return res.json({
        success: true,
        message: `${savedTransactions.length} işlem başarıyla içe aktarıldı`,
        data: {
          imported: savedTransactions.length,
          total: processedData.length,
          warnings
        }
      });

    } catch (error) {
      logError('Excel import hatası:', error);
      return res.status(500).json({
        success: false,
        message: 'Excel dosyası işlenirken bir hata oluştu'
      });
    }
  }

  // CSV dosyası yükleme ve işleme
  static async importCSV(req: Request, res: Response) {
    return new Promise<void>((resolve) => {
      try {
        if (!req.file) {
          res.status(400).json({
            success: false,
            message: 'Dosya yüklenmedi'
          });
          return resolve(undefined);
        }

        const userId = (req as any).user.id;
        const filePath = req.file.path;
        const fileExtension = path.extname(req.file.originalname).toLowerCase();

        if (fileExtension !== '.csv') {
          res.status(400).json({
            success: false,
            message: 'Sadece CSV dosyaları (.csv) desteklenir'
          });
          return resolve(undefined);
        }

        const results: any[] = [];
        const errors: any[] = [];
        const warnings: any[] = [];
        let rowNumber = 2; // Başlık satırından sonra başla

        // CSV dosyasını oku
        createReadStream(filePath)
          .pipe(csv())
          .on('data', (data: any) => {
            // Veri doğrulama
            const validationResult = ImportController.validateTransactionData(data, rowNumber);
            
            if (validationResult.isValid) {
              results.push(validationResult.data);
            } else {
              errors.push({
                row: rowNumber,
                errors: validationResult.errors
              });
            }

            if (validationResult.warnings.length > 0) {
              warnings.push({
                row: rowNumber,
                warnings: validationResult.warnings
              });
            }

            rowNumber++;
          })
          .on('end', async () => {
            try {
              // Hata varsa işlemi durdur
              if (errors.length > 0) {
                res.status(400).json({
                  success: false,
                  message: 'Dosyada hatalar bulundu',
                  errors,
                  warnings
                });
                return resolve(undefined);
              }

              // Veritabanına kaydet
              const savedTransactions = [];
              for (const transactionData of results) {
                try {
                  const transaction = await prisma.transaction.create({
                    data: {
                      ...transactionData,
                      userId
                    },
                    include: {
                      customer: {
                        select: {
                          id: true,
                          name: true,
                          code: true
                        }
                      },
                      category: {
                        select: {
                          id: true,
                          name: true
                        }
                      }
                    }
                  });
                  savedTransactions.push(transaction);
                } catch (error) {
                  errors.push({
                    row: transactionData.rowNumber,
                    errors: ['Veritabanına kaydedilemedi']
                  });
                }
              }

              res.json({
                success: true,
                message: `${savedTransactions.length} işlem başarıyla içe aktarıldı`,
                data: {
                  imported: savedTransactions.length,
                  total: results.length,
                  warnings
                }
              });
              return resolve(undefined);
            } catch (error) {
              logError('CSV import hatası:', error);
              res.status(500).json({
                success: false,
                message: 'CSV dosyası işlenirken bir hata oluştu'
              });
              return resolve(undefined);
            }
          })
          .on('error', (error: any) => {
            logError('CSV okuma hatası:', error);
            res.status(500).json({
              success: false,
              message: 'CSV dosyası okunurken bir hata oluştu'
            });
            return resolve(undefined);
          });
      } catch (error) {
        logError('CSV import hatası:', error);
        res.status(500).json({
          success: false,
          message: 'CSV dosyası işlenirken bir hata oluştu'
        });
        return resolve(undefined);
      }
    });
  }

  // Müşteri dosyası yükleme ve işleme
  static async importCustomers(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Dosya yüklenmedi'
        });
      }

      const userId = (req as any).user.id;
      const filePath = req.file.path;
      const fileExtension = path.extname(req.file.originalname).toLowerCase();

      if (!['.xlsx', '.xls', '.csv'].includes(fileExtension)) {
        return res.status(400).json({
          success: false,
          message: 'Sadece Excel (.xlsx, .xls) ve CSV (.csv) dosyaları desteklenir'
        });
      }

      let data: any[] = [];

      if (['.xlsx', '.xls'].includes(fileExtension)) {
        // Excel dosyasını oku
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (rawData.length < 2) {
          return res.status(400).json({
            success: false,
            message: 'Dosya boş veya geçersiz format'
          });
        }

        const headers = rawData[0] as string[];
        const rows = rawData.slice(1) as any[][];

        // Sütunları eşleştir
        rows.forEach(row => {
          const rowData: any = {};
          headers.forEach((header, index) => {
            rowData[header] = row[index];
          });
          data.push(rowData);
        });
      } else {
        // CSV dosyasını oku
        return new Promise((resolve, reject) => {
          const results: any[] = [];
          createReadStream(filePath)
            .pipe(csv())
            .on('data', (row: any) => results.push(row))
            .on('end', () => {
              data = results;
              resolve(undefined);
            })
            .on('error', (error: any) => {
              reject(error);
            });
        });
      }

      // Gerekli sütunları kontrol et
      const requiredColumns = ['name', 'code'];
      const missingColumns = requiredColumns.filter(col => !Object.keys(data[0] || {}).includes(col));

      if (missingColumns.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Eksik sütunlar: ${missingColumns.join(', ')}`
        });
      }

      // Veri doğrulama ve işleme
      const processedData = [];
      const errors = [];
      const warnings = [];

      for (let i = 0; i < data.length; i++) {
        const rowData = data[i];
        const validationResult = ImportController.validateCustomerData(rowData, i + 2);
        
        if (validationResult.isValid) {
          processedData.push(validationResult.data);
        } else {
          errors.push({
            row: i + 2,
            errors: validationResult.errors
          });
        }

        if (validationResult.warnings.length > 0) {
          warnings.push({
            row: i + 2,
            warnings: validationResult.warnings
          });
        }
      }

      // Hata varsa işlemi durdur
      if (errors.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Dosyada hatalar bulundu',
          errors,
          warnings
        });
      }

      // Veritabanına kaydet
      const savedCustomers = [];
      for (const customerData of processedData) {
        try {
          // Kod benzersizlik kontrolü
          const existingCustomer = await prisma.customer.findFirst({
            where: { code: customerData.code }
          });

          if (existingCustomer) {
            warnings.push({
              row: customerData.rowNumber,
              warnings: ['Bu kod zaten kullanılıyor']
            });
            continue;
          }

          const customer = await prisma.customer.create({
            data: {
              ...customerData,
              userId
            }
          });
          savedCustomers.push(customer);
        } catch (error) {
          errors.push({
            row: customerData.rowNumber,
            errors: ['Veritabanına kaydedilemedi']
          });
        }
      }

      return res.json({
        success: true,
        message: `${savedCustomers.length} müşteri başarıyla içe aktarıldı`,
        data: {
          imported: savedCustomers.length,
          total: processedData.length,
          warnings
        }
      });

    } catch (error) {
      logError('Müşteri import hatası:', error);
      return res.status(500).json({
        success: false,
        message: 'Müşteri dosyası işlenirken bir hata oluştu'
      });
    }
  }

  // İşlem verisi doğrulama
  private static validateTransactionData(data: any, rowNumber: number) {
    const errors: string[] = [];
    const warnings: string[] = [];
    const processedData: any = { rowNumber };

    // Type doğrulama
    if (!data.type || !['INCOME', 'EXPENSE'].includes(data.type.toUpperCase())) {
      errors.push('Geçerli bir işlem türü gerekli (INCOME/EXPENSE)');
    } else {
      processedData.type = data.type.toUpperCase();
    }

    // Amount doğrulama
    const amount = parseFloat(data.amount);
    if (isNaN(amount) || amount <= 0) {
      errors.push('Geçerli bir tutar gerekli (0\'dan büyük sayı)');
    } else {
      processedData.amount = amount;
    }

    // Description doğrulama
    if (!data.description || data.description.trim().length === 0) {
      errors.push('Açıklama gerekli');
    } else if (data.description.trim().length > 500) {
      errors.push('Açıklama 500 karakterden az olmalıdır');
    } else {
      processedData.description = data.description.trim();
    }

    // Date doğrulama
    const date = new Date(data.date);
    if (isNaN(date.getTime())) {
      errors.push('Geçerli bir tarih gerekli');
    } else {
      processedData.date = date;
    }

    // Category doğrulama (opsiyonel)
    if (data.category) {
      // Kategori adından ID bulma işlemi burada yapılabilir
      warnings.push('Kategori eşleştirmesi manuel olarak yapılmalıdır');
    }

    // Customer doğrulama (opsiyonel)
    if (data.customer) {
      // Müşteri adından ID bulma işlemi burada yapılabilir
      warnings.push('Müşteri eşleştirmesi manuel olarak yapılmalıdır');
    }

    return {
      isValid: errors.length === 0,
      data: processedData,
      errors,
      warnings
    };
  }

  // Müşteri verisi doğrulama
  private static validateCustomerData(data: any, rowNumber: number) {
    const errors: string[] = [];
    const warnings: string[] = [];
    const processedData: any = { rowNumber };

    // Name doğrulama
    if (!data.name || data.name.trim().length === 0) {
      errors.push('Müşteri adı gerekli');
    } else if (data.name.trim().length > 200) {
      errors.push('Müşteri adı 200 karakterden az olmalıdır');
    } else {
      processedData.name = data.name.trim();
    }

    // Code doğrulama
    if (!data.code || data.code.trim().length === 0) {
      errors.push('Müşteri kodu gerekli');
    } else if (data.code.trim().length > 50) {
      errors.push('Müşteri kodu 50 karakterden az olmalıdır');
    } else {
      processedData.code = data.code.trim();
    }

    // Phone doğrulama (opsiyonel)
    if (data.phone) {
      if (data.phone.trim().length > 20) {
        errors.push('Telefon numarası 20 karakterden az olmalıdır');
      } else {
        processedData.phone = data.phone.trim();
      }
    }

    // Address doğrulama (opsiyonel)
    if (data.address) {
      if (data.address.trim().length > 500) {
        errors.push('Adres 500 karakterden az olmalıdır');
      } else {
        processedData.address = data.address.trim();
      }
    }

    // Type doğrulama (opsiyonel)
    if (data.type) {
      if (!['INDIVIDUAL', 'COMPANY'].includes(data.type.toUpperCase())) {
        warnings.push('Geçersiz müşteri tipi, varsayılan olarak INDIVIDUAL kullanılacak');
        processedData.type = 'INDIVIDUAL';
      } else {
        processedData.type = data.type.toUpperCase();
      }
    } else {
      processedData.type = 'INDIVIDUAL';
    }

    return {
      isValid: errors.length === 0,
      data: processedData,
      errors,
      warnings
    };
  }

  // Template dosyası indirme
  static async downloadTemplate(req: Request, res: Response) {
    try {
      const { type } = req.query;

      if (!type || !['transactions', 'customers'].includes(type as string)) {
        return res.status(400).json({
          success: false,
          message: 'Geçerli bir template tipi gerekli (transactions/customers)'
        });
      }

      let headers: string[] = [];
      let sampleData: any[] = [];

      if (type === 'transactions') {
        headers = ['type', 'amount', 'description', 'date', 'category', 'customer'];
        sampleData = [
          {
            type: 'INCOME',
            amount: '1000.00',
            description: 'Müşteri ödemesi',
            date: '2024-01-15',
            category: 'Satış',
            customer: 'ABC Şirketi'
          },
          {
            type: 'EXPENSE',
            amount: '500.00',
            description: 'Ofis malzemeleri',
            date: '2024-01-16',
            category: 'Genel Giderler',
            customer: ''
          }
        ];
      } else if (type === 'customers') {
        headers = ['name', 'code', 'phone', 'address', 'type'];
        sampleData = [
          {
            name: 'ABC Şirketi',
            code: 'ABC001',
            phone: '0212 123 45 67',
            address: 'İstanbul, Türkiye',
            type: 'COMPANY'
          },
          {
            name: 'Ahmet Yılmaz',
            code: 'AY001',
            phone: '0532 123 45 67',
            address: 'Ankara, Türkiye',
            type: 'INDIVIDUAL'
          }
        ];
      }

      // Excel dosyası oluştur
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet([headers, ...sampleData]);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');

      // Buffer oluştur
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      // Response headers
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${type}_template.xlsx"`);
      res.setHeader('Content-Length', buffer.length);

      return res.send(buffer);

    } catch (error) {
      logError('Template indirme hatası:', error);
      return res.status(500).json({
        success: false,
        message: 'Template dosyası oluşturulurken bir hata oluştu'
      });
    }
  }
} 