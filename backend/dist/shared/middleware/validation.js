"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bankTransactionValidations = exports.categoryValidations = exports.transactionValidations = exports.customerValidations = exports.commonValidations = exports.validate = void 0;
const express_validator_1 = require("express-validator");
const validate = (validations) => {
    return async (req, res, next) => {
        await Promise.all(validations.map(validation => validation.run(req)));
        const errors = (0, express_validator_1.validationResult)(req);
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
exports.validate = validate;
exports.commonValidations = {
    id: (0, express_validator_1.body)('id').optional().isUUID().withMessage('Geçersiz ID formatı'),
    page: (0, express_validator_1.body)('page').optional().isInt({ min: 1 }).withMessage('Sayfa numarası 1\'den büyük olmalı'),
    limit: (0, express_validator_1.body)('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit 1-100 arasında olmalı'),
    amount: (0, express_validator_1.body)('amount').isFloat({ min: 0 }).withMessage('Miktar pozitif bir sayı olmalı'),
    description: (0, express_validator_1.body)('description').trim().isLength({ min: 1, max: 500 }).withMessage('Açıklama 1-500 karakter arasında olmalı'),
    email: (0, express_validator_1.body)('email').optional().isEmail().withMessage('Geçersiz email formatı'),
    phone: (0, express_validator_1.body)('phone').optional().matches(/^[\+]?[0-9\s\-\(\)]{10,}$/).withMessage('Geçersiz telefon formatı'),
    date: (0, express_validator_1.body)('date').optional().isISO8601().withMessage('Geçersiz tarih formatı'),
    boolean: (0, express_validator_1.body)('isPaid').optional().isBoolean().withMessage('Boolean değer olmalı'),
    enum: (field, values) => (0, express_validator_1.body)(field).isIn(values).withMessage(`Geçersiz değer. İzin verilen değerler: ${values.join(', ')}`)
};
exports.customerValidations = [
    (0, express_validator_1.body)('name').trim().isLength({ min: 2, max: 100 }).withMessage('Müşteri adı 2-100 karakter arasında olmalı'),
    exports.commonValidations.email,
    exports.commonValidations.phone,
    (0, express_validator_1.body)('address').optional().trim().isLength({ max: 500 }).withMessage('Adres 500 karakterden uzun olamaz'),
    (0, express_validator_1.body)('taxNumber').optional().trim().isLength({ max: 50 }).withMessage('Vergi numarası 50 karakterden uzun olamaz'),
    (0, express_validator_1.body)('dueDays').optional().isInt({ min: 0 }).withMessage('Vade günü negatif olamaz')
];
exports.transactionValidations = [
    exports.commonValidations.amount,
    exports.commonValidations.description,
    exports.commonValidations.enum('type', ['INCOME', 'EXPENSE']),
    (0, express_validator_1.body)('categoryId').isUUID().withMessage('Geçersiz kategori ID'),
    (0, express_validator_1.body)('customerId').optional().isUUID().withMessage('Geçersiz müşteri ID'),
    exports.commonValidations.date,
    exports.commonValidations.boolean
];
exports.categoryValidations = [
    (0, express_validator_1.body)('name').trim().isLength({ min: 2, max: 50 }).withMessage('Kategori adı 2-50 karakter arasında olmalı'),
    exports.commonValidations.enum('type', ['INCOME', 'EXPENSE']),
    (0, express_validator_1.body)('color').optional().isHexColor().withMessage('Geçersiz renk formatı'),
    (0, express_validator_1.body)('icon').optional().trim().isLength({ max: 50 }).withMessage('İkon 50 karakterden uzun olamaz')
];
exports.bankTransactionValidations = [
    (0, express_validator_1.body)('messageId').trim().isLength({ min: 1 }).withMessage('Mesaj ID gerekli'),
    exports.commonValidations.amount,
    exports.commonValidations.description,
    exports.commonValidations.date,
    exports.commonValidations.enum('type', ['INCOME', 'EXPENSE'])
];
//# sourceMappingURL=validation.js.map