import { Request, Response, NextFunction } from 'express';
import { body, validationResult, ValidationChain } from 'express-validator';

/**
 * Validasyon hatalarını kontrol eden middleware
 */
export const validate = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Tüm validasyonları çalıştır
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    return res.status(400).json({
      success: false,
      message: 'Validasyon hatası',
      errors: errors.array()
    });
  };
};

/**
 * Ortak validasyon kuralları
 */
export const commonValidations = {
  // ID validasyonu
  id: body('id').optional().isUUID().withMessage('Geçersiz ID formatı'),
  
  // Sayfa validasyonu
  page: body('page').optional().isInt({ min: 1 }).withMessage('Sayfa numarası 1\'den büyük olmalı'),
  
  // Limit validasyonu
  limit: body('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit 1-100 arasında olmalı'),
  
  // Miktar validasyonu
  amount: body('amount').isFloat({ min: 0 }).withMessage('Miktar pozitif bir sayı olmalı'),
  
  // Açıklama validasyonu
  description: body('description').trim().isLength({ min: 1, max: 500 }).withMessage('Açıklama 1-500 karakter arasında olmalı'),
  
  // Email validasyonu
  email: body('email').optional().isEmail().withMessage('Geçersiz email formatı'),
  
  // Telefon validasyonu
  phone: body('phone').optional().matches(/^[\+]?[0-9\s\-\(\)]{10,}$/).withMessage('Geçersiz telefon formatı'),
  
  // Tarih validasyonu
  date: body('date').optional().isISO8601().withMessage('Geçersiz tarih formatı'),
  
  // Boolean validasyonu
  boolean: body('isPaid').optional().isBoolean().withMessage('Boolean değer olmalı'),
  
  // Enum validasyonu
  enum: (field: string, values: string[]) => 
    body(field).isIn(values).withMessage(`Geçersiz değer. İzin verilen değerler: ${values.join(', ')}`)
};

/**
 * Müşteri validasyonları
 */
export const customerValidations = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Müşteri adı 2-100 karakter arasında olmalı'),
  commonValidations.email,
  commonValidations.phone,
  body('address').optional().trim().isLength({ max: 500 }).withMessage('Adres 500 karakterden uzun olamaz'),
  body('taxNumber').optional().trim().isLength({ max: 50 }).withMessage('Vergi numarası 50 karakterden uzun olamaz'),
  body('dueDays').optional().isInt({ min: 0 }).withMessage('Vade günü negatif olamaz')
];

/**
 * İşlem validasyonları
 */
export const transactionValidations = [
  commonValidations.amount,
  commonValidations.description,
  commonValidations.enum('type', ['INCOME', 'EXPENSE']),
  body('categoryId').isUUID().withMessage('Geçersiz kategori ID'),
  body('customerId').optional().isUUID().withMessage('Geçersiz müşteri ID'),
  commonValidations.date,
  commonValidations.boolean
];

/**
 * Kategori validasyonları
 */
export const categoryValidations = [
  body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Kategori adı 2-50 karakter arasında olmalı'),
  commonValidations.enum('type', ['INCOME', 'EXPENSE']),
  body('color').optional().isHexColor().withMessage('Geçersiz renk formatı'),
  body('icon').optional().trim().isLength({ max: 50 }).withMessage('İkon 50 karakterden uzun olamaz')
];

/**
 * Banka işlemi validasyonları
 */
export const bankTransactionValidations = [
  body('messageId').trim().isLength({ min: 1 }).withMessage('Mesaj ID gerekli'),
  commonValidations.amount,
  commonValidations.description,
  commonValidations.date,
  commonValidations.enum('type', ['INCOME', 'EXPENSE'])
];
