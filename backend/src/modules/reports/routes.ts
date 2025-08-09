import { Router } from 'express';
import { query } from 'express-validator';
import { ReportController } from './controller';
import { authMiddleware } from '../../shared/middleware/auth';

const router = Router();

// Validasyon kuralları
const dateValidation = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Geçerli bir başlangıç tarihi giriniz'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('Geçerli bir bitiş tarihi giriniz')
];

const requiredDateValidation = [
  query('startDate')
    .isISO8601()
    .withMessage('Başlangıç tarihi gerekli'),
  query('endDate')
    .isISO8601()
    .withMessage('Bitiş tarihi gerekli')
];

const yearValidation = [
  query('year')
    .optional()
    .isInt({ min: 2000, max: 2100 })
    .withMessage('Geçerli bir yıl giriniz (2000-2100)')
];

const typeValidation = [
  query('type')
    .optional()
    .isIn(['INCOME', 'EXPENSE'])
    .withMessage('Geçerli bir işlem türü giriniz')
];

const limitValidation = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit 1-100 arasında olmalıdır')
];

// Dashboard özet raporu
router.get('/dashboard', authMiddleware, dateValidation, ReportController.getDashboardSummary);

// Aylık trend raporu
router.get('/monthly-trend', authMiddleware, yearValidation, ReportController.getMonthlyTrend);

// Kategori bazında rapor
router.get('/category', authMiddleware, [
  ...dateValidation,
  ...typeValidation
], ReportController.getCategoryReport);

// Müşteri bazında rapor
router.get('/customer', authMiddleware, [
  ...dateValidation,
  ...typeValidation,
  ...limitValidation
], ReportController.getCustomerReport);

// Günlük trend raporu
router.get('/daily-trend', authMiddleware, requiredDateValidation, ReportController.getDailyTrend);

// Nakit akışı raporu
router.get('/cash-flow', authMiddleware, requiredDateValidation, ReportController.getCashFlowReport);

// Birleşik dashboard raporu (Entegrasyon)
router.get('/integrated-dashboard', authMiddleware, ReportController.getIntegratedDashboard);

// Tahsilat raporu
router.get('/collections', authMiddleware, dateValidation, ReportController.getCollectionReport);

// Yaşlandırma analizi
router.get('/aging', authMiddleware, ReportController.getAgingAnalysis);

// Ödenmemiş faturalar raporu
router.get('/unpaid-invoices', authMiddleware, [
  query('customerId').optional().isString().withMessage('Geçerli bir müşteri ID giriniz'),
  query('startDate').optional().isISO8601().withMessage('Geçerli bir başlangıç tarihi giriniz'),
  query('endDate').optional().isISO8601().withMessage('Geçerli bir bitiş tarihi giriniz'),
  query('overdueOnly').optional().isIn(['true', 'false']).withMessage('overdueOnly true veya false olmalıdır'),
  query('sortBy').optional().isIn(['dueDate', 'date', 'amount', 'customerName']).withMessage('Geçerli bir sıralama alanı giriniz'),
  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Geçerli bir sıralama yönü giriniz'),
  query('page').optional().isInt({ min: 1 }).withMessage('Sayfa numarası pozitif tamsayı olmalıdır'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit 1-100 arasında olmalıdır')
], ReportController.getUnpaidInvoices);

// Ödenmiş faturalar raporu
router.get('/paid-invoices', authMiddleware, [
  query('customerId').optional().isString().withMessage('Geçerli bir müşteri ID giriniz'),
  query('startDate').optional().isISO8601().withMessage('Geçerli bir başlangıç tarihi giriniz'),
  query('endDate').optional().isISO8601().withMessage('Geçerli bir bitiş tarihi giriniz'),
  query('sortBy').optional().isIn(['date', 'amount', 'customerName']).withMessage('Geçerli bir sıralama alanı giriniz'),
  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Geçerli bir sıralama yönü giriniz'),
  query('page').optional().isInt({ min: 1 }).withMessage('Sayfa numarası pozitif tamsayı olmalıdır'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit 1-100 arasında olmalıdır')
], ReportController.getPaidInvoices);

// Müşteri bazında ödenmemiş faturalar özeti
router.get('/customer/:customerId/unpaid-invoices', authMiddleware, ReportController.getCustomerUnpaidInvoicesSummary);

// Müşteri bazında ödenmiş faturalar özeti
router.get('/customer/:customerId/paid-invoices', authMiddleware, ReportController.getCustomerPaidInvoicesSummary);

export default router; 