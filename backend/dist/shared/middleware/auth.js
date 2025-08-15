"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.roleMiddleware = exports.adminMiddleware = exports.authMiddleware = void 0;
const logger_1 = require("../logger");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const authMiddleware = async (req, res, next) => {
    try {
        console.log('🔐 Auth middleware - URL:', req.url);
        console.log('🔐 Auth middleware - Headers:', req.headers);
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            console.log('❌ Auth middleware - Token bulunamadı');
            return res.status(401).json({
                success: false,
                error: 'Yetkilendirme token\'ı gerekli'
            });
        }
        const token = authHeader.substring(7);
        console.log('🔐 Auth middleware - Token alındı:', token.substring(0, 20) + '...');
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        console.log('🔐 Auth middleware - Token doğrulandı, userId:', decoded.userId);
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: {
                id: true,
                username: true,
                email: true,
                role: true,
                isActive: true
            }
        });
        console.log('🔐 Auth middleware - Kullanıcı bulundu:', user ? 'Evet' : 'Hayır');
        if (!user || !user.isActive) {
            console.log('❌ Auth middleware - Kullanıcı bulunamadı veya pasif');
            return res.status(401).json({
                success: false,
                error: 'Geçersiz veya pasif kullanıcı'
            });
        }
        req.user = user;
        console.log('✅ Auth middleware - Kullanıcı doğrulandı:', user.username);
        return next();
    }
    catch (error) {
        console.error('❌ Auth middleware error:', error);
        (0, logger_1.logError)('Auth middleware error:', error);
        if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            return res.status(401).json({
                success: false,
                error: 'Geçersiz token'
            });
        }
        if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            return res.status(401).json({
                success: false,
                error: 'Token süresi dolmuş'
            });
        }
        return res.status(500).json({
            success: false,
            error: 'Kimlik doğrulama hatası'
        });
    }
};
exports.authMiddleware = authMiddleware;
const adminMiddleware = (req, res, next) => {
    if (!req.user || req.user.role !== 'ADMIN') {
        return res.status(403).json({
            success: false,
            error: 'Admin yetkisi gerekli'
        });
    }
    return next();
};
exports.adminMiddleware = adminMiddleware;
const roleMiddleware = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                error: 'Bu işlem için yetkiniz yok'
            });
        }
        return next();
    };
};
exports.roleMiddleware = roleMiddleware;
//# sourceMappingURL=auth.js.map