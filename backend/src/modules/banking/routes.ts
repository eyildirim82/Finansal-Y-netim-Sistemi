import { Router } from 'express';
import { BankingController } from './controller';

const router = Router();
const controller = new BankingController();

// Otomatik email çekme
router.post('/fetch-emails', controller.fetchEmails.bind(controller));

// Email işleme (manuel)
router.post('/process-email', controller.processEmail.bind(controller));

// Banka işlemleri listesi
router.get('/transactions', controller.getBankTransactions.bind(controller));

// Eşleşmeyen ödemeler
router.get('/unmatched', controller.getUnmatchedPayments.bind(controller));

// Manuel eşleştirme
router.post('/match', controller.matchPayment.bind(controller));

// Email ayarları
router.get('/email-settings', controller.getEmailSettings.bind(controller));

// Email bağlantı testi
router.post('/test-connection', controller.testEmailConnection.bind(controller));

// Eşleştirme istatistikleri
router.get('/matching-stats', controller.getMatchingStats.bind(controller));

// Otomatik eşleştirme çalıştır
router.post('/run-auto-matching', controller.runAutoMatching.bind(controller));

export default router; 