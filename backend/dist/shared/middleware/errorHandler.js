"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const logger_1 = require("../logger");
const errorHandler = (err, req, res, next) => {
    let error = { ...err };
    error.message = err.message;
    (0, logger_1.logError)('Error', err, {
        url: req.url,
        method: req.method,
        params: req.params,
        query: req.query
    });
    if (err.name === 'PrismaClientValidationError') {
        const message = 'Geçersiz veri formatı';
        error = { message, statusCode: 400 };
    }
    if (err.name === 'PrismaClientKnownRequestError') {
        const message = 'Bu kayıt zaten mevcut';
        error = { message, statusCode: 400 };
    }
    if (err.name === 'JsonWebTokenError') {
        const message = 'Geçersiz token';
        error = { message, statusCode: 401 };
    }
    if (err.name === 'TokenExpiredError') {
        const message = 'Token süresi dolmuş';
        error = { message, statusCode: 401 };
    }
    if (err.name === 'ValidationError') {
        const message = Object.values(err).map((val) => val.message).join(', ');
        error = { message, statusCode: 400 };
    }
    if (err.name === 'CastError') {
        const message = 'Geçersiz ID formatı';
        error = { message, statusCode: 400 };
    }
    res.status(error.statusCode || 500).json({
        success: false,
        error: error.message || 'Sunucu hatası',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};
exports.errorHandler = errorHandler;
//# sourceMappingURL=errorHandler.js.map