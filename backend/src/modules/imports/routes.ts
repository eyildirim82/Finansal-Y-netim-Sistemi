import { Router } from 'express';
import { query } from 'express-validator';
import multer from 'multer';
import path from 'path';
import { ImportController } from './controller';
import { authMiddleware } from '../../shared/middleware/auth';

const router = Router();

// Multer konfigürasyonu
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req: any, file: any, cb: any) => {
  const allowedExtensions = ['.xlsx', '.xls', '.csv'];
  const fileExtension = path.extname(file.originalname).toLowerCase();
  
  if (allowedExtensions.includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(new Error('Sadece Excel (.xlsx, .xls) ve CSV (.csv) dosyaları desteklenir'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Validasyon kuralları
const templateValidation = [
  query('type')
    .isIn(['transactions', 'customers'])
    .withMessage('Geçerli bir şablon türü gerekli (transactions/customers)')
];

// Excel dosyası import
router.post('/excel', authMiddleware, upload.single('file'), ImportController.importExcel);

// CSV dosyası import
router.post('/csv', authMiddleware, upload.single('file'), ImportController.importCSV);

// Müşteri listesi import
router.post('/customers', authMiddleware, upload.single('file'), ImportController.importCustomers);

// Import şablonu indirme
router.get('/template', authMiddleware, templateValidation, ImportController.downloadTemplate);

// Multer hata yakalama middleware
router.use((error: any, req: any, res: any, next: any) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'Dosya boyutu çok büyük (maksimum 10MB)'
      });
    }
  }
  
  if (error.message) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
  
  next(error);
});

export default router; 