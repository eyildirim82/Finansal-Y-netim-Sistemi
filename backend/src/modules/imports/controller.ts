import { logError } from '../../shared/logger';
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';
import csv from 'csv-parser';
import { createReadStream } from 'fs';
import { validationResult } from 'express-validator';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

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
        await new Promise<void>((resolve, reject) => {
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
      const requiredColumns = ['name'];
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
        
        // Veri doğrulama
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

  static async downloadTemplate(req: Request, res: Response) {
    try {
      // Burada gerçek template dosyası oluşturulup gönderilebilir
      return res.status(501).json({ success: false, message: 'Henüz uygulanmadı' });
    } catch (error) {
      logError('Template indirme hatası:', error);
      return res.status(500).json({ success: false, message: 'Template dosyası oluşturulurken bir hata oluştu' });
    }
  }

  // Transaction veri doğrulama
  static validateTransactionData(data: any, rowNumber: number) {
    const errors: string[] = [];
    const warnings: string[] = [];
    const processedData: any = { rowNumber };

    // Type validation
    if (!data.type || !['INCOME', 'EXPENSE'].includes(data.type)) {
      errors.push('Geçersiz işlem tipi (INCOME veya EXPENSE olmalı)');
    } else {
      processedData.type = data.type;
    }

    // Amount validation
    if (!data.amount || isNaN(parseFloat(data.amount))) {
      errors.push('Geçersiz tutar');
    } else {
      processedData.amount = parseFloat(data.amount);
    }

    // Description validation
    if (!data.description) {
      errors.push('Açıklama gerekli');
    } else {
      processedData.description = data.description;
    }

    // Date validation
    if (!data.date) {
      errors.push('Tarih gerekli');
    } else {
      const date = new Date(data.date);
      if (isNaN(date.getTime())) {
        errors.push('Geçersiz tarih formatı');
      } else {
        processedData.date = date;
      }
    }

    // Optional fields
    if (data.customerId) processedData.customerId = data.customerId;
    if (data.categoryId) processedData.categoryId = data.categoryId;

    return {
      isValid: errors.length === 0,
      data: processedData,
      errors,
      warnings
    };
  }

  // Customer veri doğrulama
  static validateCustomerData(data: any, rowNumber: number) {
    const errors: string[] = [];
    const warnings: string[] = [];
    const processedData: any = { rowNumber };

    // Name validation
    if (!data.name || data.name.trim().length === 0) {
      errors.push('Müşteri adı gerekli');
    } else {
      processedData.name = data.name.trim();
    }

    // Code generation or validation
    if (data.code) {
      processedData.code = data.code;
    } else {
      processedData.code = `CUST_${uuidv4()}`;
      warnings.push('Müşteri kodu otomatik oluşturuldu');
    }

    // Optional fields
    if (data.phone) processedData.phone = data.phone;
    if (data.address) processedData.address = data.address;
    if (data.type && ['INDIVIDUAL', 'CORPORATE'].includes(data.type)) {
      processedData.type = data.type;
    } else {
      processedData.type = 'INDIVIDUAL';
      warnings.push('Müşteri tipi varsayılan olarak INDIVIDUAL olarak ayarlandı');
    }
    if (data.accountType) processedData.accountType = data.accountType;
    if (data.tag1) processedData.tag1 = data.tag1;
    if (data.tag2) processedData.tag2 = data.tag2;

    return {
      isValid: errors.length === 0,
      data: processedData,
      errors,
      warnings
    };
  }
}