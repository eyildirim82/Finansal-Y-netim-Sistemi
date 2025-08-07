"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const controller_1 = require("./controller");
const auth_1 = require("../../shared/middleware/auth");
const router = (0, express_1.Router)();
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path_1.default.extname(file.originalname));
    }
});
const fileFilter = (req, file, cb) => {
    const allowedExtensions = ['.xlsx', '.xls', '.csv'];
    const fileExtension = path_1.default.extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(fileExtension)) {
        cb(null, true);
    }
    else {
        cb(new Error('Sadece Excel (.xlsx, .xls) ve CSV (.csv) dosyaları desteklenir'), false);
    }
};
const upload = (0, multer_1.default)({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024
    }
});
const templateValidation = [
    (0, express_validator_1.query)('type')
        .isIn(['transactions', 'customers'])
        .withMessage('Geçerli bir şablon türü gerekli (transactions/customers)')
];
router.post('/excel', auth_1.authMiddleware, upload.single('file'), controller_1.ImportController.importExcel);
router.post('/csv', auth_1.authMiddleware, upload.single('file'), controller_1.ImportController.importCSV);
router.post('/customers', auth_1.authMiddleware, upload.single('file'), controller_1.ImportController.importCustomers);
router.get('/template', auth_1.authMiddleware, templateValidation, controller_1.ImportController.downloadTemplate);
router.use((error, req, res, next) => {
    if (error instanceof multer_1.default.MulterError) {
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
exports.default = router;
//# sourceMappingURL=routes.js.map