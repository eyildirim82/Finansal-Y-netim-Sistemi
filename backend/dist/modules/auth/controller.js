"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.changePassword = exports.getProfile = exports.register = exports.login = exports.registerValidation = exports.loginValidation = void 0;
const logger_1 = require("../../shared/logger");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = require("@prisma/client");
const express_validator_1 = require("express-validator");
const prisma = new client_1.PrismaClient();
exports.loginValidation = [
    (0, express_validator_1.body)('username').notEmpty().withMessage('Kullanıcı adı gerekli'),
    (0, express_validator_1.body)('password').notEmpty().withMessage('Şifre gerekli')
];
exports.registerValidation = [
    (0, express_validator_1.body)('username')
        .isLength({ min: 3 })
        .withMessage('Kullanıcı adı en az 3 karakter olmalı')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('Kullanıcı adı sadece harf, rakam ve alt çizgi içerebilir'),
    (0, express_validator_1.body)('email')
        .isEmail()
        .withMessage('Geçerli bir email adresi girin'),
    (0, express_validator_1.body)('password')
        .isLength({ min: 6 })
        .withMessage('Şifre en az 6 karakter olmalı')
];
const generateToken = (userId) => {
    return jsonwebtoken_1.default.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
};
const login = async (req, res) => {
    try {
        console.log('Login isteği alındı', req.body);
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            console.log('Validation hatası:', errors.array());
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }
        const { username, password } = req.body;
        console.log('Kullanıcı adı:', username);
        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    { username },
                    { email: username }
                ]
            }
        });
        console.log('Bulunan kullanıcı:', user);
        if (!user) {
            console.log('Kullanıcı bulunamadı');
            return res.status(401).json({
                success: false,
                error: 'Geçersiz kullanıcı adı veya şifre'
            });
        }
        if (!user.isActive) {
            console.log('Kullanıcı pasif durumda');
            return res.status(401).json({
                success: false,
                error: 'Hesabınız pasif durumda'
            });
        }
        const isPasswordValid = await bcryptjs_1.default.compare(password, user.password);
        console.log('Şifre doğrulama sonucu:', isPasswordValid);
        if (!isPasswordValid) {
            console.log('Şifre yanlış');
            return res.status(401).json({
                success: false,
                error: 'Geçersiz kullanıcı adı veya şifre'
            });
        }
        const token = generateToken(user.id);
        console.log('Token oluşturuldu');
        const { password: _, ...userWithoutPassword } = user;
        return res.json({
            success: true,
            data: {
                user: userWithoutPassword,
                token
            }
        });
    }
    catch (error) {
        console.log('Login catch bloğu, hata:', error);
        (0, logger_1.logError)('Login error:', error);
        return res.status(500).json({
            success: false,
            error: 'Giriş yapılırken hata oluştu'
        });
    }
};
exports.login = login;
const register = async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }
        const { username, email, password } = req.body;
        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [
                    { username },
                    { email }
                ]
            }
        });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                error: 'Bu kullanıcı adı veya email zaten kullanılıyor'
            });
        }
        const saltRounds = 12;
        const hashedPassword = await bcryptjs_1.default.hash(password, saltRounds);
        const newUser = await prisma.user.create({
            data: {
                username,
                email,
                password: hashedPassword,
                role: 'USER'
            },
            select: {
                id: true,
                username: true,
                email: true,
                role: true,
                isActive: true,
                createdAt: true
            }
        });
        const token = generateToken(newUser.id);
        return res.status(201).json({
            success: true,
            data: {
                user: newUser,
                token
            }
        });
    }
    catch (error) {
        (0, logger_1.logError)('Register error:', error);
        return res.status(500).json({
            success: false,
            error: 'Kayıt olurken hata oluştu'
        });
    }
};
exports.register = register;
const getProfile = async (req, res) => {
    try {
        const userId = req.user?.id;
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                username: true,
                email: true,
                role: true,
                isActive: true,
                createdAt: true,
                updatedAt: true
            }
        });
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'Kullanıcı bulunamadı'
            });
        }
        return res.json({
            success: true,
            data: {
                user
            }
        });
    }
    catch (error) {
        (0, logger_1.logError)('Get profile error:', error);
        return res.status(500).json({
            success: false,
            error: 'Profil bilgileri alınırken hata oluştu'
        });
    }
};
exports.getProfile = getProfile;
const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user?.id;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                error: 'Mevcut şifre ve yeni şifre gerekli'
            });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                error: 'Yeni şifre en az 6 karakter olmalı'
            });
        }
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'Kullanıcı bulunamadı'
            });
        }
        const isCurrentPasswordValid = await bcryptjs_1.default.compare(currentPassword, user.password);
        if (!isCurrentPasswordValid) {
            return res.status(400).json({
                success: false,
                error: 'Mevcut şifre yanlış'
            });
        }
        const saltRounds = 12;
        const hashedNewPassword = await bcryptjs_1.default.hash(newPassword, saltRounds);
        await prisma.user.update({
            where: { id: userId },
            data: { password: hashedNewPassword }
        });
        return res.json({
            success: true,
            message: 'Şifre başarıyla değiştirildi'
        });
    }
    catch (error) {
        (0, logger_1.logError)('Change password error:', error);
        return res.status(500).json({
            success: false,
            error: 'Şifre değiştirilirken hata oluştu'
        });
    }
};
exports.changePassword = changePassword;
//# sourceMappingURL=controller.js.map