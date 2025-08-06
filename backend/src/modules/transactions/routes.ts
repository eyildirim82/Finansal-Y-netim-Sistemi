import { Router } from 'express';
import { body, query, param } from 'express-validator';
import { TransactionController } from './controller';
import { authMiddleware, roleMiddleware } from '../../shared/middleware/auth';

const router = Router();

// Validasyon kuralları
const transactionValidation = [
  body('type')
    .isIn(['INCOME', 'EXPENSE'])
    .withMessage('İşlem türü INCOME veya EXPENSE olmalıdır'),
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Tutar 0.01\'den büyük olmalıdır'),
  body('description')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Açıklama 1-500 karakter arasında olmalıdır'),
  body('date')
    .isISO8601()
    .withMessage('Geçerli bir tarih formatı giriniz'),
  body('categoryId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Geçerli bir kategori ID giriniz'),
  body('customerId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Geçerli bir müşteri ID giriniz'),
  body('reference')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Referans 100 karakterden az olmalıdır'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notlar 1000 karakterden az olmalıdır')
];

const updateTransactionValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Geçerli bir işlem ID giriniz'),
  ...transactionValidation
];

const queryValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Sayfa numarası 1\'den büyük olmalıdır'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit 1-100 arasında olmalıdır'),
  query('type')
    .optional()
    .isIn(['INCOME', 'EXPENSE'])
    .withMessage('Geçerli bir işlem türü giriniz'),
  query('categoryId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Geçerli bir kategori ID giriniz'),
  query('customerId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Geçerli bir müşteri ID giriniz'),
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Geçerli bir başlangıç tarihi giriniz'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('Geçerli bir bitiş tarihi giriniz'),
  query('minAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Minimum tutar 0\'dan büyük olmalıdır'),
  query('maxAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Maksimum tutar 0\'dan büyük olmalıdır'),
  query('search')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Arama terimi 1-100 karakter arasında olmalıdır')
];

// Tüm işlemleri getir (filtreleme ve sayfalama ile)
router.get('/', authMiddleware, queryValidation, TransactionController.getAllTransactions);

// İşlem istatistikleri
router.get('/stats', authMiddleware, TransactionController.getTransactionStats);

// Tek işlem getir
router.get('/:id', authMiddleware, [
  param('id').isInt({ min: 1 }).withMessage('Geçerli bir işlem ID giriniz')
], TransactionController.getTransaction);

// Yeni işlem oluştur
router.post('/', authMiddleware, transactionValidation, TransactionController.createTransaction);

// İşlem güncelle
router.put('/:id', authMiddleware, updateTransactionValidation, TransactionController.updateTransaction);

// İşlem sil
router.delete('/:id', authMiddleware, [
  param('id').isInt({ min: 1 }).withMessage('Geçerli bir işlem ID giriniz')
], TransactionController.deleteTransaction);

// Toplu işlem silme (sadece admin)
router.delete('/bulk/delete', authMiddleware, roleMiddleware(['ADMIN']), [
  body('ids')
    .isArray({ min: 1 })
    .withMessage('En az bir ID gerekli'),
  body('ids.*')
    .isInt({ min: 1 })
    .withMessage('Geçerli ID\'ler giriniz')
], TransactionController.deleteMultipleTransactions);

export default router; 