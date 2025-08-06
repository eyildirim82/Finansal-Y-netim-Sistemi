import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';
import * as csv from 'csv-parser';
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

      res.json({
        success: true,
        message: `${savedTransactions.length} işlem başarıyla içe aktarıldı`,
        data: {
          imported: savedTransactions.length,
          total: processedData.length,
          warnings
        }
      });

    } catch (error) {
      console.error('Excel import hatası:', error);
      res.status(500).json({
        success: false,
        message: 'Excel dosyası işlenirken bir hata oluştu'
      });
    }
  }

  // CSV dosyası yükleme ve işleme
  static async importCSV(req: Request, res: Response) {
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

      if (fileExtension !== '.csv') {
        return res.status(400).json({
          success: false,
          message: 'Sadece CSV dosyaları (.csv) desteklenir'
        });
      }

      const results: any[] = [];
      const errors: any[] = [];
      const warnings: any[] = [];
      let rowNumber = 2; // Başlık satırından sonra başla

      // CSV dosyasını oku
      createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => {
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
              return res.status(400).json({
                success: false,
                message: 'Dosyada hatalar bulundu',
                errors,
                warnings
              });
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

          } catch (error) {
            console.error('CSV import hatası:', error);
            res.status(500).json({
              success: false,
              message: 'CSV dosyası işlenirken bir hata oluştu'
            });
          }
        })
        .on('error', (error) => {
          console.error('CSV okuma hatası:', error);
          res.status(500).json({
            success: false,
            message: 'CSV dosyası okunurken bir hata oluştu'
          });
        });

    } catch (error) {
      console.error('CSV import hatası:', error);
      res.status(500).json({
        success: false,
        message: 'CSV dosyası işlenirken bir hata oluştu'
      });
    }
  }

  // Müşteri listesi import
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

      if (fileExtension === '.csv') {
        // CSV okuma
        const results: any[] = [];
        createReadStream(filePath)
          .pipe(csv())
          .on('data', (row) => results.push(row))
          .on('end', () => {
            data = results;
          });
      } else {
        // Excel okuma
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

        data = rows.map(row => {
          const rowData: any = {};
          headers.forEach((header, index) => {
            rowData[header] = row[index];
          });
          return rowData;
        });
      }

      // Gerekli sütunları kontrol et
      const requiredColumns = ['name'];
      const missingColumns = requiredColumns.filter(col => 
        !Object.keys(data[0] || {}).includes(col)
      );

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
          // Email benzersizlik kontrolü
          if (customerData.email) {
            const existingCustomer = await prisma.customer.findFirst({
              where: { email: customerData.email }
            });

            if (existingCustomer) {
              warnings.push({
                row: customerData.rowNumber,
                warnings: ['Bu email adresi zaten kullanılıyor']
              });
              continue;
            }
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

      res.json({
        success: true,
        message: `${savedCustomers.length} müşteri başarıyla içe aktarıldı`,
        data: {
          imported: savedCustomers.length,
          total: processedData.length,
          warnings
        }
      });

    } catch (error) {
      console.error('Müşteri import hatası:', error);
      res.status(500).json({
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

    // Reference ve notes (opsiyonel)
    if (data.reference) {
      if (data.reference.length > 100) {
        errors.push('Referans 100 karakterden az olmalıdır');
      } else {
        processedData.reference = data.reference.trim();
      }
    }

    if (data.notes) {
      if (data.notes.length > 1000) {
        errors.push('Notlar 1000 karakterden az olmalıdır');
      } else {
        processedData.notes = data.notes.trim();
      }
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
    } else if (data.name.trim().length > 100) {
      errors.push('Müşteri adı 100 karakterden az olmalıdır');
    } else {
      processedData.name = data.name.trim();
    }

    // Email doğrulama (opsiyonel)
    if (data.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) {
        errors.push('Geçerli bir email adresi giriniz');
      } else {
        processedData.email = data.email.trim();
      }
    }

    // Phone doğrulama (opsiyonel)
    if (data.phone) {
      if (data.phone.length < 10 || data.phone.length > 20) {
        errors.push('Telefon numarası 10-20 karakter arasında olmalıdır');
      } else {
        processedData.phone = data.phone.trim();
      }
    }

    // Address doğrulama (opsiyonel)
    if (data.address) {
      if (data.address.length > 500) {
        errors.push('Adres 500 karakterden az olmalıdır');
      } else {
        processedData.address = data.address.trim();
      }
    }

    // Type doğrulama (opsiyonel)
    if (data.type) {
      if (!['INDIVIDUAL', 'COMPANY'].includes(data.type.toUpperCase())) {
        errors.push('Geçerli bir müşteri türü giriniz (INDIVIDUAL/COMPANY)');
      } else {
        processedData.type = data.type.toUpperCase();
      }
    } else {
      processedData.type = 'INDIVIDUAL'; // Varsayılan değer
    }

    // Tax number doğrulama (opsiyonel)
    if (data.taxNumber) {
      if (data.taxNumber.length > 50) {
        errors.push('Vergi numarası 50 karakterden az olmalıdır');
      } else {
        processedData.taxNumber = data.taxNumber.trim();
      }
    }

    // Notes doğrulama (opsiyonel)
    if (data.notes) {
      if (data.notes.length > 1000) {
        errors.push('Notlar 1000 karakterden az olmalıdır');
      } else {
        processedData.notes = data.notes.trim();
      }
    }

    return {
      isValid: errors.length === 0,
      data: processedData,
      errors,
      warnings
    };
  }

  // Import şablonu indirme
  static async downloadTemplate(req: Request, res: Response) {
    try {
      const { type } = req.query;

      if (!type || !['transactions', 'customers'].includes(type as string)) {
        return res.status(400).json({
          success: false,
          message: 'Geçerli bir şablon türü gerekli (transactions/customers)'
        });
      }

      let headers: string[] = [];
      let sampleData: any[] = [];

      if (type === 'transactions') {
        headers = ['type', 'amount', 'description', 'date', 'category', 'customer', 'reference', 'notes'];
        sampleData = [
          {
            type: 'INCOME',
            amount: '1000.00',
            description: 'Müşteri ödemesi',
            date: '2024-01-15',
            category: 'Satış',
            customer: 'ABC Şirketi',
            reference: 'INV-001',
            notes: 'Ocak ayı ödemesi'
          },
          {
            type: 'EXPENSE',
            amount: '500.00',
            description: 'Ofis kirası',
            date: '2024-01-01',
            category: 'Kira',
            customer: '',
            reference: 'RENT-001',
            notes: 'Aylık kira ödemesi'
          }
        ];
      } else if (type === 'customers') {
        headers = ['name', 'email', 'phone', 'address', 'type', 'taxNumber', 'notes'];
        sampleData = [
          {
            name: 'ABC Şirketi',
            email: 'info@abc.com',
            phone: '0212 123 45 67',
            address: 'İstanbul, Türkiye',
            type: 'COMPANY',
            taxNumber: '1234567890',
            notes: 'Kurumsal müşteri'
          },
          {
            name: 'Ahmet Yılmaz',
            email: 'ahmet@email.com',
            phone: '0532 987 65 43',
            address: 'Ankara, Türkiye',
            type: 'INDIVIDUAL',
            taxNumber: '',
            notes: 'Bireysel müşteri'
          }
        ];
      }

      // Excel dosyası oluştur
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(sampleData, { header: headers });
      
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Şablon');
      
      // Dosyayı buffer olarak oluştur
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${type}_template.xlsx"`);
      res.send(buffer);

    } catch (error) {
      console.error('Şablon indirme hatası:', error);
      res.status(500).json({
        success: false,
        message: 'Şablon indirilirken bir hata oluştu'
      });
    }
  }
} 