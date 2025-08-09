import { Router } from 'express';
import { body, query, param } from 'express-validator';
import { CustomerController } from './controller';
import { authMiddleware, roleMiddleware } from '../../shared/middleware/auth';

const router = Router();

// Validasyon kuralları
const customerValidation = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Müşteri adı 1-100 karakter arasında olmalıdır'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Geçerli bir email adresi giriniz'),
  body('phone')
    .optional()
    .trim()
    .isLength({ min: 10, max: 20 })
    .withMessage('Telefon numarası 10-20 karakter arasında olmalıdır'),
  body('address')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Adres 500 karakterden az olmalıdır'),
  body('type')
    .optional()
    .isIn(['INDIVIDUAL', 'COMPANY'])
    .withMessage('Müşteri türü INDIVIDUAL veya COMPANY olmalıdır'),
  body('accountType')
    .optional()
    .isIn(['CASH', 'CREDIT', 'FACTORING'])
    .withMessage('Hesap türü CASH, CREDIT veya FACTORING olmalıdır'),
  body('taxNumber')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Vergi numarası 50 karakterden az olmalıdır'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notlar 1000 karakterden az olmalıdır'),
                body('dueDays')
                .optional()
                .isInt({ min: 1, max: 365 })
                .withMessage('Vade günü 1-365 arasında olmalıdır')
];

const updateCustomerValidation = [
  param('id')
    .isString()
    .withMessage('Geçerli bir müşteri ID giriniz'),
  ...customerValidation
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
    .isIn(['INDIVIDUAL', 'COMPANY'])
    .withMessage('Geçerli bir müşteri türü giriniz'),
  query('search')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Arama terimi 1-100 karakter arasında olmalıdır'),
  query('sortBy')
    .optional()
    .isIn(['name', 'phone', 'address', 'type'])
    .withMessage('Geçerli bir sıralama alanı giriniz'),
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sıralama yönü asc veya desc olmalıdır')
];

// Tüm müşterileri getir (filtreleme ve sayfalama ile)
router.get('/', authMiddleware, queryValidation, CustomerController.getAllCustomers);

// Müşteri arama (autocomplete için)
router.get('/search', authMiddleware, [
  query('q')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Arama terimi en az 2 karakter olmalıdır'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit 1-50 arasında olmalıdır')
], CustomerController.searchCustomers);

// Toplu müşteri silme (sadece admin)
router.delete('/bulk/delete', authMiddleware, roleMiddleware(['ADMIN']), [
  body('ids')
    .isArray({ min: 1 })
    .withMessage('En az bir ID gerekli'),
  body('ids.*')
    .isInt({ min: 1 })
    .withMessage('Geçerli ID\'ler giriniz')
], CustomerController.deleteMultipleCustomers);

// Eski müşterileri silme (sadece admin)
router.delete('/delete-old', authMiddleware, roleMiddleware(['ADMIN']), CustomerController.deleteOldCustomers);

// Yeni müşteri oluştur
router.post('/', authMiddleware, customerValidation, CustomerController.createCustomer);

// Müşteri güncelle
router.put('/:id', authMiddleware, updateCustomerValidation, CustomerController.updateCustomer);

// Vade günü güncelle (sadece dueDays alanı için)
router.patch('/:id/due-days', authMiddleware, [
  param('id')
    .isString()
    .withMessage('Geçerli bir müşteri ID giriniz'),
  body('dueDays')
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage('Vade günü 1-365 arasında olmalıdır')
], CustomerController.updateCustomerDueDays);

// Müşteri sil
router.delete('/:id', authMiddleware, [
  param('id').isString().withMessage('Geçerli bir müşteri ID giriniz')
], CustomerController.deleteCustomer);

// Tek müşteri getir
router.get('/:id', authMiddleware, [
  param('id').isString().withMessage('Geçerli bir müşteri ID giriniz')
], CustomerController.getCustomer);

// Müşteri istatistikleri
router.get('/:customerId/stats', authMiddleware, [
  param('customerId').isString().withMessage('Geçerli bir müşteri ID giriniz')
], CustomerController.getCustomerStats);

export default router; 