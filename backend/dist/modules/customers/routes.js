"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const controller_1 = require("./controller");
const auth_1 = require("../../shared/middleware/auth");
const router = (0, express_1.Router)();
const customerValidation = [
    (0, express_validator_1.body)('name')
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Müşteri adı 1-100 karakter arasında olmalıdır'),
    (0, express_validator_1.body)('email')
        .optional()
        .isEmail()
        .withMessage('Geçerli bir email adresi giriniz'),
    (0, express_validator_1.body)('phone')
        .optional()
        .trim()
        .isLength({ min: 10, max: 20 })
        .withMessage('Telefon numarası 10-20 karakter arasında olmalıdır'),
    (0, express_validator_1.body)('address')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Adres 500 karakterden az olmalıdır'),
    (0, express_validator_1.body)('type')
        .isIn(['INDIVIDUAL', 'COMPANY'])
        .withMessage('Müşteri türü INDIVIDUAL veya COMPANY olmalıdır'),
    (0, express_validator_1.body)('taxNumber')
        .optional()
        .trim()
        .isLength({ max: 50 })
        .withMessage('Vergi numarası 50 karakterden az olmalıdır'),
    (0, express_validator_1.body)('notes')
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .withMessage('Notlar 1000 karakterden az olmalıdır')
];
const updateCustomerValidation = [
    (0, express_validator_1.param)('id')
        .isString()
        .withMessage('Geçerli bir müşteri ID giriniz'),
    ...customerValidation
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
        .isIn(['INDIVIDUAL', 'COMPANY'])
        .withMessage('Geçerli bir müşteri türü giriniz'),
    (0, express_validator_1.query)('search')
        .optional()
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Arama terimi 1-100 karakter arasında olmalıdır'),
    (0, express_validator_1.query)('sortBy')
        .optional()
        .isIn(['name', 'phone', 'address', 'type'])
        .withMessage('Geçerli bir sıralama alanı giriniz'),
    (0, express_validator_1.query)('sortOrder')
        .optional()
        .isIn(['asc', 'desc'])
        .withMessage('Sıralama yönü asc veya desc olmalıdır')
];
router.get('/', auth_1.authMiddleware, queryValidation, controller_1.CustomerController.getAllCustomers);
router.get('/search', auth_1.authMiddleware, [
    (0, express_validator_1.query)('q')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Arama terimi en az 2 karakter olmalıdır'),
    (0, express_validator_1.query)('limit')
        .optional()
        .isInt({ min: 1, max: 50 })
        .withMessage('Limit 1-50 arasında olmalıdır')
], controller_1.CustomerController.searchCustomers);
router.delete('/bulk/delete', auth_1.authMiddleware, (0, auth_1.roleMiddleware)(['ADMIN']), [
    (0, express_validator_1.body)('ids')
        .isArray({ min: 1 })
        .withMessage('En az bir ID gerekli'),
    (0, express_validator_1.body)('ids.*')
        .isInt({ min: 1 })
        .withMessage('Geçerli ID\'ler giriniz')
], controller_1.CustomerController.deleteMultipleCustomers);
router.delete('/delete-old', auth_1.authMiddleware, (0, auth_1.roleMiddleware)(['ADMIN']), controller_1.CustomerController.deleteOldCustomers);
router.post('/', auth_1.authMiddleware, customerValidation, controller_1.CustomerController.createCustomer);
router.put('/:id', auth_1.authMiddleware, updateCustomerValidation, controller_1.CustomerController.updateCustomer);
router.delete('/:id', auth_1.authMiddleware, [
    (0, express_validator_1.param)('id').isString().withMessage('Geçerli bir müşteri ID giriniz')
], controller_1.CustomerController.deleteCustomer);
router.get('/:id', auth_1.authMiddleware, [
    (0, express_validator_1.param)('id').isString().withMessage('Geçerli bir müşteri ID giriniz')
], controller_1.CustomerController.getCustomer);
router.get('/:customerId/stats', auth_1.authMiddleware, [
    (0, express_validator_1.param)('customerId').isString().withMessage('Geçerli bir müşteri ID giriniz')
], controller_1.CustomerController.getCustomerStats);
exports.default = router;
//# sourceMappingURL=routes.js.map