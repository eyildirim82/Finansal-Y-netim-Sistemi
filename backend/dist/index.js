"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("./shared/logger");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const dotenv_1 = __importDefault(require("dotenv"));
const routes_1 = __importDefault(require("./modules/auth/routes"));
const routes_2 = __importDefault(require("./modules/transactions/routes"));
const routes_3 = __importDefault(require("./modules/customers/routes"));
const routes_4 = __importDefault(require("./modules/categories/routes"));
const routes_5 = __importDefault(require("./modules/imports/routes"));
const routes_6 = __importDefault(require("./modules/reports/routes"));
const routes_7 = __importDefault(require("./modules/extracts/routes"));
const routes_8 = __importDefault(require("./modules/banking/routes"));
const routes_9 = __importDefault(require("./modules/cash/routes"));
const errorHandler_1 = require("./shared/middleware/errorHandler");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Çok fazla istek gönderildi. Lütfen daha sonra tekrar deneyin.'
});
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));
app.use((0, compression_1.default)());
app.use(limiter);
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});
app.use('/api/auth', routes_1.default);
app.use('/api/transactions', routes_2.default);
app.use('/api/customers', routes_3.default);
app.use('/api/categories', routes_4.default);
app.use('/api/imports', routes_5.default);
app.use('/api/reports', routes_6.default);
app.use('/api/extracts', routes_7.default);
app.use('/api/banking', routes_8.default);
app.use('/api/cash', routes_9.default);
app.use(errorHandler_1.errorHandler);
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Endpoint bulunamadı',
        path: req.originalUrl
    });
});
app.listen(PORT, () => {
    console.log(`🚀 Finansal Yönetim Sistemi Backend ${PORT} portunda çalışıyor`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
});
exports.default = app;
//# sourceMappingURL=index.js.map