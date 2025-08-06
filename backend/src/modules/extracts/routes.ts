import { Router } from 'express';
import { ExtractController } from './controller';
import multer from 'multer';
import path from 'path';
import { authMiddleware } from '../../shared/middleware/auth';

const router = Router();
const controller = new ExtractController();

// Multer konfigürasyonu
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'extract-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Sadece Excel ve CSV dosyaları kabul edilir'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Authentication middleware'ini tüm route'lara uygula
router.use(authMiddleware);

// Ekstre yükleme
router.post('/upload', upload.single('file'), controller.uploadExcel.bind(controller));

// Ekstre listesi
router.get('/', controller.getExtracts.bind(controller));

// Ekstre detayı
router.get('/:id', controller.getExtractDetail.bind(controller));

// Bakiye doğrulama
router.get('/:extractId/validate-balances', controller.validateBalances.bind(controller));

export default router; 