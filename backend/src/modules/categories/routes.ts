import { Router } from 'express';
import { body, query, param } from 'express-validator';
import { CategoryController } from './controller';
import { authMiddleware } from '../../shared/middleware/auth';

const router = Router();

// Validasyon kuralları
const categoryValidation = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Kategori adı 1-50 karakter arasında olmalıdır'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Açıklama 200 karakterden az olmalıdır'),
  body('color')
    .optional()
    .trim()
    .isLength({ min: 3, max: 7 })
    .withMessage('Geçerli bir renk kodu giriniz (örn: #FF0000)'),
  body('type')
    .isIn(['INCOME', 'EXPENSE'])
    .withMessage('Kategori türü INCOME veya EXPENSE olmalıdır')
];

const updateCategoryValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Geçerli bir kategori ID giriniz'),
  ...categoryValidation
];

const queryValidation = [
  query('type')
    .optional()
    .isIn(['INCOME', 'EXPENSE'])
    .withMessage('Geçerli bir kategori türü giriniz'),
  query('search')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Arama terimi 1-100 karakter arasında olmalıdır')
];

const searchValidation = [
  query('q')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Arama terimi en az 2 karakter olmalıdır'),
  query('type')
    .optional()
    .isIn(['INCOME', 'EXPENSE'])
    .withMessage('Geçerli bir kategori türü giriniz'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit 1-50 arasında olmalıdır')
];

// Tüm kategorileri getir
router.get('/', authMiddleware, queryValidation, CategoryController.getAllCategories);

// Kategori arama (autocomplete için)
router.get('/search', authMiddleware, searchValidation, CategoryController.searchCategories);

// Tek kategori getir
router.get('/:id', authMiddleware, [
  param('id').isInt({ min: 1 }).withMessage('Geçerli bir kategori ID giriniz')
], CategoryController.getCategory);

// Kategori istatistikleri
router.get('/:categoryId/stats', authMiddleware, [
  param('categoryId').isInt({ min: 1 }).withMessage('Geçerli bir kategori ID giriniz')
], CategoryController.getCategoryStats);

// Yeni kategori oluştur
router.post('/', authMiddleware, categoryValidation, CategoryController.createCategory);

// Kategori güncelle
router.put('/:id', authMiddleware, updateCategoryValidation, CategoryController.updateCategory);

// Kategori sil
router.delete('/:id', authMiddleware, [
  param('id').isInt({ min: 1 }).withMessage('Geçerli bir kategori ID giriniz')
], CategoryController.deleteCategory);

export default router; 