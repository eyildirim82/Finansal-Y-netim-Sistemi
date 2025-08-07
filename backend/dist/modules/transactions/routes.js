"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const controller_1 = require("./controller");
const auth_1 = require("../../shared/middleware/auth");
const router = (0, express_1.Router)();
const transactionValidation = [
    (0, express_validator_1.body)('type')
        .isIn(['INCOME', 'EXPENSE'])
        .withMessage('İşlem türü INCOME veya EXPENSE olmalıdır'),
    (0, express_validator_1.body)('amount')
        .isFloat({ min: 0.01 })
        .withMessage('Tutar 0.01\'den büyük olmalıdır'),
    (0, express_validator_1.body)('description')
        .trim()
        .isLength({ min: 1, max: 500 })
        .withMessage('Açıklama 1-500 karakter arasında olmalıdır'),
    (0, express_validator_1.body)('date')
        .isISO8601()
        .withMessage('Geçerli bir tarih formatı giriniz'),
    (0, express_validator_1.body)('categoryId')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Geçerli bir kategori ID giriniz'),
    (0, express_validator_1.body)('customerId')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Geçerli bir müşteri ID giriniz'),
    (0, express_validator_1.body)('reference')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Referans 100 karakterden az olmalıdır'),
    (0, express_validator_1.body)('notes')
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .withMessage('Notlar 1000 karakterden az olmalıdır')
];
const updateTransactionValidation = [
    (0, express_validator_1.param)('id')
        .isInt({ min: 1 })
        .withMessage('Geçerli bir işlem ID giriniz'),
    ...transactionValidation
];
const queryValidation = [
    (0, express_validator_1.query)('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Sayfa numarası 1\'den büyük olmalıdır'),
    (0, express_validator_1.query)('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit 1-100 arasında olmalıdır'),
    (0, express_validator_1.query)('type')
        .optional()
        .isIn(['INCOME', 'EXPENSE'])
        .withMessage('Geçerli bir işlem türü giriniz'),
    (0, express_validator_1.query)('categoryId')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Geçerli bir kategori ID giriniz'),
    (0, express_validator_1.query)('customerId')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Geçerli bir müşteri ID giriniz'),
    (0, express_validator_1.query)('startDate')
        .optional()
        .isISO8601()
        .withMessage('Geçerli bir başlangıç tarihi giriniz'),
    (0, express_validator_1.query)('endDate')
        .optional()
        .isISO8601()
        .withMessage('Geçerli bir bitiş tarihi giriniz'),
    (0, express_validator_1.query)('minAmount')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Minimum tutar 0\'dan büyük olmalıdır'),
    (0, express_validator_1.query)('maxAmount')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Maksimum tutar 0\'dan büyük olmalıdır'),
    (0, express_validator_1.query)('search')
        .optional()
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Arama terimi 1-100 karakter arasında olmalıdır')
];
router.get('/', auth_1.authMiddleware, queryValidation, controller_1.TransactionController.getAllTransactions);
router.get('/stats', auth_1.authMiddleware, controller_1.TransactionController.getTransactionStats);
router.get('/:id', auth_1.authMiddleware, [
    (0, express_validator_1.param)('id').isInt({ min: 1 }).withMessage('Geçerli bir işlem ID giriniz')
], controller_1.TransactionController.getTransaction);
router.post('/', auth_1.authMiddleware, transactionValidation, controller_1.TransactionController.createTransaction);
router.put('/:id', auth_1.authMiddleware, updateTransactionValidation, controller_1.TransactionController.updateTransaction);
router.delete('/:id', auth_1.authMiddleware, [
    (0, express_validator_1.param)('id').isInt({ min: 1 }).withMessage('Geçerli bir işlem ID giriniz')
], controller_1.TransactionController.deleteTransaction);
router.delete('/bulk/delete', auth_1.authMiddleware, (0, auth_1.roleMiddleware)(['ADMIN']), [
    (0, express_validator_1.body)('ids')
        .isArray({ min: 1 })
        .withMessage('En az bir ID gerekli'),
    (0, express_validator_1.body)('ids.*')
        .isInt({ min: 1 })
        .withMessage('Geçerli ID\'ler giriniz')
], controller_1.TransactionController.deleteMultipleTransactions);
exports.default = router;
//# sourceMappingURL=routes.js.map