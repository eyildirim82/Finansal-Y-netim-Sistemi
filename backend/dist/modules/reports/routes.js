"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const controller_1 = require("./controller");
const auth_1 = require("../../shared/middleware/auth");
const router = (0, express_1.Router)();
const dateValidation = [
    (0, express_validator_1.query)('startDate')
        .optional()
        .isISO8601()
        .withMessage('Geçerli bir başlangıç tarihi giriniz'),
    (0, express_validator_1.query)('endDate')
        .optional()
        .isISO8601()
        .withMessage('Geçerli bir bitiş tarihi giriniz')
];
const requiredDateValidation = [
    (0, express_validator_1.query)('startDate')
        .isISO8601()
        .withMessage('Başlangıç tarihi gerekli'),
    (0, express_validator_1.query)('endDate')
        .isISO8601()
        .withMessage('Bitiş tarihi gerekli')
];
const yearValidation = [
    (0, express_validator_1.query)('year')
        .optional()
        .isInt({ min: 2000, max: 2100 })
        .withMessage('Geçerli bir yıl giriniz (2000-2100)')
];
const typeValidation = [
    (0, express_validator_1.query)('type')
        .optional()
        .isIn(['INCOME', 'EXPENSE'])
        .withMessage('Geçerli bir işlem türü giriniz')
];
const limitValidation = [
    (0, express_validator_1.query)('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit 1-100 arasında olmalıdır')
];
router.get('/dashboard', auth_1.authMiddleware, dateValidation, controller_1.ReportController.getDashboardSummary);
router.get('/monthly-trend', auth_1.authMiddleware, yearValidation, controller_1.ReportController.getMonthlyTrend);
router.get('/category', auth_1.authMiddleware, [
    ...dateValidation,
    ...typeValidation
], controller_1.ReportController.getCategoryReport);
router.get('/customer', auth_1.authMiddleware, [
    ...dateValidation,
    ...typeValidation,
    ...limitValidation
], controller_1.ReportController.getCustomerReport);
router.get('/customer-payment-performance', auth_1.authMiddleware, dateValidation, controller_1.ReportController.getCustomerPaymentPerformance);
router.get('/daily-trend', auth_1.authMiddleware, requiredDateValidation, controller_1.ReportController.getDailyTrend);
router.get('/cash-flow', auth_1.authMiddleware, requiredDateValidation, controller_1.ReportController.getCashFlowReport);
router.get('/integrated-dashboard', auth_1.authMiddleware, controller_1.ReportController.getIntegratedDashboard);
router.get('/collections', auth_1.authMiddleware, dateValidation, controller_1.ReportController.getCollectionReport);
router.get('/aging', auth_1.authMiddleware, controller_1.ReportController.getAgingAnalysis);
router.get('/unpaid-invoices', auth_1.authMiddleware, [
    (0, express_validator_1.query)('customerId').optional().isString().withMessage('Geçerli bir müşteri ID giriniz'),
    (0, express_validator_1.query)('startDate').optional().isISO8601().withMessage('Geçerli bir başlangıç tarihi giriniz'),
    (0, express_validator_1.query)('endDate').optional().isISO8601().withMessage('Geçerli bir bitiş tarihi giriniz'),
    (0, express_validator_1.query)('overdueOnly').optional().isIn(['true', 'false']).withMessage('overdueOnly true veya false olmalıdır'),
    (0, express_validator_1.query)('sortBy').optional().isIn(['dueDate', 'date', 'amount', 'customerName']).withMessage('Geçerli bir sıralama alanı giriniz'),
    (0, express_validator_1.query)('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Geçerli bir sıralama yönü giriniz'),
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }).withMessage('Sayfa numarası pozitif tamsayı olmalıdır'),
    (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit 1-100 arasında olmalıdır')
], controller_1.ReportController.getUnpaidInvoices);
router.get('/paid-invoices', auth_1.authMiddleware, [
    (0, express_validator_1.query)('customerId').optional().isString().withMessage('Geçerli bir müşteri ID giriniz'),
    (0, express_validator_1.query)('startDate').optional().isISO8601().withMessage('Geçerli bir başlangıç tarihi giriniz'),
    (0, express_validator_1.query)('endDate').optional().isISO8601().withMessage('Geçerli bir bitiş tarihi giriniz'),
    (0, express_validator_1.query)('sortBy').optional().isIn(['date', 'amount', 'customerName']).withMessage('Geçerli bir sıralama alanı giriniz'),
    (0, express_validator_1.query)('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Geçerli bir sıralama yönü giriniz'),
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }).withMessage('Sayfa numarası pozitif tamsayı olmalıdır'),
    (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit 1-100 arasında olmalıdır')
], controller_1.ReportController.getPaidInvoices);
router.get('/customer/:customerId/unpaid-invoices', auth_1.authMiddleware, controller_1.ReportController.getCustomerUnpaidInvoicesSummary);
router.get('/customer/:customerId/paid-invoices', auth_1.authMiddleware, controller_1.ReportController.getCustomerPaidInvoicesSummary);
router.get('/customer/:customerId/payments', auth_1.authMiddleware, controller_1.ReportController.getCustomerPayments);
router.get('/debug-fifo', auth_1.authMiddleware, controller_1.ReportController.debugFifoCalculation);
exports.default = router;
//# sourceMappingURL=routes.js.map