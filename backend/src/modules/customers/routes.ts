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
    .trim()
    .isLength({ max: 100 })
    .withMessage('Hesap tipi 100 karakterden az olmalıdır'),
  body('tag1')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Etiket 1 50 karakterden az olmalıdır'),
  body('tag2')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Etiket 2 50 karakterden az olmalıdır')
];

const updateCustomerValidation = [
  param('id')
    .isInt({ min: 1 })
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
    .isIn(['name', 'phone', 'createdAt', 'updatedAt'])
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

// Tek müşteri getir
router.get('/:id', authMiddleware, [
  param('id').isInt({ min: 1 }).withMessage('Geçerli bir müşteri ID giriniz')
], CustomerController.getCustomer);

// Müşteri istatistikleri
router.get('/:customerId/stats', authMiddleware, [
  param('customerId').isInt({ min: 1 }).withMessage('Geçerli bir müşteri ID giriniz')
], CustomerController.getCustomerStats);

// Yeni müşteri oluştur
router.post('/', authMiddleware, customerValidation, CustomerController.createCustomer);

// Müşteri güncelle
router.put('/:id', authMiddleware, updateCustomerValidation, CustomerController.updateCustomer);

// Müşteri sil
router.delete('/:id', authMiddleware, [
  param('id').isInt({ min: 1 }).withMessage('Geçerli bir müşteri ID giriniz')
], CustomerController.deleteCustomer);

// Toplu müşteri silme (sadece admin)
router.delete('/bulk/delete', authMiddleware, roleMiddleware(['ADMIN']), [
  body('ids')
    .isArray({ min: 1 })
    .withMessage('En az bir ID gerekli'),
  body('ids.*')
    .isInt({ min: 1 })
    .withMessage('Geçerli ID\'ler giriniz')
], CustomerController.deleteMultipleCustomers);

export default router; 