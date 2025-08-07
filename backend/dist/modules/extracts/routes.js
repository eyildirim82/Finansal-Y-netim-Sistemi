"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const controller_1 = require("./controller");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const auth_1 = require("../../shared/middleware/auth");
const router = (0, express_1.Router)();
const controller = new controller_1.ExtractController();
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'extract-' + uniqueSuffix + path_1.default.extname(file.originalname));
    }
});
const upload = (0, multer_1.default)({
    storage: storage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel',
            'text/csv'
        ];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error('Sadece Excel ve CSV dosyaları kabul edilir'));
        }
    },
    limits: {
        fileSize: 10 * 1024 * 1024
    }
});
router.use(auth_1.authMiddleware);
router.post('/upload', upload.single('file'), controller.uploadExcel.bind(controller));
router.get('/', controller.getExtracts.bind(controller));
router.get('/:id', controller.getExtractDetail.bind(controller));
router.get('/:extractId/validate-balances', controller.validateBalances.bind(controller));
exports.default = router;
//# sourceMappingURL=routes.js.map