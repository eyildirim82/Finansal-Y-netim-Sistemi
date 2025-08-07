"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const controller_1 = require("./controller");
const auth_1 = require("../../shared/middleware/auth");
const router = (0, express_1.Router)();
const categoryValidation = [
    (0, express_validator_1.body)('name')
        .trim()
        .isLength({ min: 1, max: 50 })
        .withMessage('Kategori adı 1-50 karakter arasında olmalıdır'),
    (0, express_validator_1.body)('description')
        .optional()
        .trim()
        .isLength({ max: 200 })
        .withMessage('Açıklama 200 karakterden az olmalıdır'),
    (0, express_validator_1.body)('color')
        .optional()
        .trim()
        .isLength({ min: 3, max: 7 })
        .withMessage('Geçerli bir renk kodu giriniz (örn: #FF0000)'),
    (0, express_validator_1.body)('type')
        .isIn(['INCOME', 'EXPENSE'])
        .withMessage('Kategori türü INCOME veya EXPENSE olmalıdır')
];
const updateCategoryValidation = [
    (0, express_validator_1.param)('id')
        .isInt({ min: 1 })
        .withMessage('Geçerli bir kategori ID giriniz'),
    ...categoryValidation
];
const queryValidation = [
    (0, express_validator_1.query)('type')
        .optional()
        .isIn(['INCOME', 'EXPENSE'])
        .withMessage('Geçerli bir kategori türü giriniz'),
    (0, express_validator_1.query)('search')
        .optional()
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Arama terimi 1-100 karakter arasında olmalıdır')
];
const searchValidation = [
    (0, express_validator_1.query)('q')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Arama terimi en az 2 karakter olmalıdır'),
    (0, express_validator_1.query)('type')
        .optional()
        .isIn(['INCOME', 'EXPENSE'])
        .withMessage('Geçerli bir kategori türü giriniz'),
    (0, express_validator_1.query)('limit')
        .optional()
        .isInt({ min: 1, max: 50 })
        .withMessage('Limit 1-50 arasında olmalıdır')
];
router.get('/', auth_1.authMiddleware, queryValidation, controller_1.CategoryController.getAllCategories);
router.get('/search', auth_1.authMiddleware, searchValidation, controller_1.CategoryController.searchCategories);
router.get('/:id', auth_1.authMiddleware, [
    (0, express_validator_1.param)('id').isInt({ min: 1 }).withMessage('Geçerli bir kategori ID giriniz')
], controller_1.CategoryController.getCategory);
router.get('/:categoryId/stats', auth_1.authMiddleware, [
    (0, express_validator_1.param)('categoryId').isInt({ min: 1 }).withMessage('Geçerli bir kategori ID giriniz')
], controller_1.CategoryController.getCategoryStats);
router.post('/', auth_1.authMiddleware, categoryValidation, controller_1.CategoryController.createCategory);
router.put('/:id', auth_1.authMiddleware, updateCategoryValidation, controller_1.CategoryController.updateCategory);
router.delete('/:id', auth_1.authMiddleware, [
    (0, express_validator_1.param)('id').isInt({ min: 1 }).withMessage('Geçerli bir kategori ID giriniz')
], controller_1.CategoryController.deleteCategory);
exports.default = router;
//# sourceMappingURL=routes.js.map