"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const controller_1 = require("./controller");
const auth_1 = require("../../shared/middleware/auth");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const router = (0, express_1.Router)();
const controller = new controller_1.BankingController();
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'pdf-' + uniqueSuffix + path_1.default.extname(file.originalname));
    }
});
const upload = (0, multer_1.default)({
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        }
        else {
            cb(new Error('Sadece PDF dosyaları kabul edilir'));
        }
    },
    limits: {
        fileSize: 10 * 1024 * 1024
    }
});
router.post('/fetch-emails', controller.fetchEmails.bind(controller));
router.post('/process-email', controller.processEmail.bind(controller));
router.get('/transactions', controller.getBankTransactions.bind(controller));
router.get('/pdf-transactions', controller.getPDFTransactions.bind(controller));
router.get('/unmatched', controller.getUnmatchedPayments.bind(controller));
router.post('/match', controller.matchPayment.bind(controller));
router.get('/email-settings', controller.getEmailSettings.bind(controller));
router.post('/test-connection', controller.testEmailConnection.bind(controller));
router.get('/matching-stats', controller.getMatchingStats.bind(controller));
router.post('/run-auto-matching', controller.runAutoMatching.bind(controller));
router.get('/email-stats', controller.getEmailStats.bind(controller));
router.post('/fetch-emails-by-date', controller.fetchEmailsByDateRange.bind(controller));
router.post('/start-monitoring', controller.startRealtimeMonitoring.bind(controller));
router.post('/stop-monitoring', controller.stopRealtimeMonitoring.bind(controller));
router.put('/email-settings', controller.updateEmailSettings.bind(controller));
router.get('/missing-transactions', auth_1.authMiddleware, controller.detectMissingTransactions.bind(controller));
router.post('/parse-pdf', auth_1.authMiddleware, upload.single('pdf'), controller.parsePDFTransactions.bind(controller));
router.post('/save-pdf-transactions', auth_1.authMiddleware, controller.savePDFTransactions.bind(controller));
router.delete('/transactions/:transactionId', auth_1.authMiddleware, controller.deleteTransaction.bind(controller));
router.delete('/transactions', auth_1.authMiddleware, controller.deleteTransactions.bind(controller));
router.post('/cleanup-old-transactions', auth_1.authMiddleware, controller.cleanupOldTransactions.bind(controller));
router.post('/process-pdf-etl', auth_1.authMiddleware, upload.single('pdf'), controller.processPDFWithETL.bind(controller));
router.post('/test-process-pdf-etl', upload.single('pdf'), controller.processPDFWithETL.bind(controller));
exports.default = router;
//# sourceMappingURL=routes.js.map