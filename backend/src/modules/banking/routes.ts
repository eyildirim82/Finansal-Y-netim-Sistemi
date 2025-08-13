import { Router } from 'express';
import { BankingController } from './controller';
import { authMiddleware } from '../../shared/middleware/auth';
import multer from 'multer';
import path from 'path';

const router = Router();
const controller = new BankingController();

// Multer konfigürasyonu
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'pdf-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Sadece PDF dosyaları kabul edilir'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Otomatik email çekme
router.post('/fetch-emails', controller.fetchEmails.bind(controller));

// Email işleme (manuel)
router.post('/process-email', controller.processEmail.bind(controller));

// Banka işlemleri listesi
router.get('/transactions', controller.getBankTransactions.bind(controller));

// PDF işlemleri listesi
router.get('/pdf-transactions', controller.getPDFTransactions.bind(controller));

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

// Yeni endpoint'ler
// Email istatistikleri
router.get('/email-stats', controller.getEmailStats.bind(controller));

// Tarih aralığında email çekme
router.post('/fetch-emails-by-date', controller.fetchEmailsByDateRange.bind(controller));

// Realtime monitoring
router.post('/start-monitoring', controller.startRealtimeMonitoring.bind(controller));
router.post('/stop-monitoring', controller.stopRealtimeMonitoring.bind(controller));

// Email ayarlarını güncelle
router.put('/email-settings', controller.updateEmailSettings.bind(controller));

// Eksik işlem tespiti
router.get('/missing-transactions', authMiddleware, controller.detectMissingTransactions.bind(controller));

// PDF işlemleri
// PDF hesap hareketlerini parse et
router.post('/parse-pdf', authMiddleware, upload.single('pdf'), controller.parsePDFTransactions.bind(controller));

// PDF'den çıkarılan işlemleri kaydet
router.post('/save-pdf-transactions', authMiddleware, controller.savePDFTransactions.bind(controller));

// İşlem silme endpoint'leri
// Tek işlem sil
router.delete('/transactions/:transactionId', authMiddleware, controller.deleteTransaction.bind(controller));

// Toplu işlem silme
router.delete('/transactions', authMiddleware, controller.deleteTransactions.bind(controller));

// Eski işlemleri temizle
router.post('/cleanup-old-transactions', authMiddleware, controller.cleanupOldTransactions.bind(controller));

// Yeni ETL PDF işleme endpoint'i
router.post('/process-pdf-etl', authMiddleware, upload.single('pdf'), controller.processPDFWithETL.bind(controller));

// Test için auth olmayan ETL endpoint'i
router.post('/test-process-pdf-etl', upload.single('pdf'), controller.processPDFWithETL.bind(controller));

export default router; 