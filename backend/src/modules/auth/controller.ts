import { logError } from '../../shared/logger';
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { body, validationResult } from 'express-validator';

const prisma = new PrismaClient();

// Validation rules
export const loginValidation = [
  body('username').notEmpty().withMessage('Kullanıcı adı gerekli'),
  body('password').notEmpty().withMessage('Şifre gerekli')
];

export const registerValidation = [
  body('username')
    .isLength({ min: 3 })
    .withMessage('Kullanıcı adı en az 3 karakter olmalı')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Kullanıcı adı sadece harf, rakam ve alt çizgi içerebilir'),
  body('email')
    .isEmail()
    .withMessage('Geçerli bir email adresi girin'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Şifre en az 6 karakter olmalı')
];

// JWT token oluştur
const generateToken = (userId: string) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET!,
    { expiresIn: '7d' }
  );
};

// Login
export const login = async (req: Request, res: Response) => {
  try {
    console.log('Login isteği alındı', req.body);
    // Validation kontrolü
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation hatası:', errors.array());
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { username, password } = req.body;
    console.log('Kullanıcı adı:', username);

    // Kullanıcıyı bul
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

    // Şifreyi kontrol et
    const isPasswordValid = await bcrypt.compare(password, user.password);
    console.log('Şifre doğrulama sonucu:', isPasswordValid);
    if (!isPasswordValid) {
      console.log('Şifre yanlış');
      return res.status(401).json({
        success: false,
        error: 'Geçersiz kullanıcı adı veya şifre'
      });
    }

    // Token oluştur
    const token = generateToken(user.id);
    console.log('Token oluşturuldu');

    // Kullanıcı bilgilerini döndür (şifre hariç)
    const { password: _, ...userWithoutPassword } = user;

    return res.json({
      success: true,
      data: {
        user: userWithoutPassword,
        token
      }
    });

  } catch (error) {
    console.log('Login catch bloğu, hata:', error);
    logError('Login error:', error);
    return res.status(500).json({
      success: false,
      error: 'Giriş yapılırken hata oluştu'
    });
  }
};

// Register
export const register = async (req: Request, res: Response) => {
  try {
    // Validation kontrolü
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { username, email, password } = req.body;

    // Kullanıcı adı ve email kontrolü
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

    // Şifreyi hash'le
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Kullanıcıyı oluştur
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

    // Token oluştur
    const token = generateToken(newUser.id);

    return res.status(201).json({
      success: true,
      data: {
        user: newUser,
        token
      }
    });

  } catch (error) {
    logError('Register error:', error);
    return res.status(500).json({
      success: false,
      error: 'Kayıt olurken hata oluştu'
    });
  }
};

// Profile bilgilerini getir
export const getProfile = async (req: Request, res: Response) => {
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

  } catch (error) {
    logError('Get profile error:', error);
    return res.status(500).json({
      success: false,
      error: 'Profil bilgileri alınırken hata oluştu'
    });
  }
};

// Şifre değiştir
export const changePassword = async (req: Request, res: Response) => {
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

    // Kullanıcıyı bul
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Kullanıcı bulunamadı'
      });
    }

    // Mevcut şifreyi kontrol et
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        error: 'Mevcut şifre yanlış'
      });
    }

    // Yeni şifreyi hash'le
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Şifreyi güncelle
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword }
    });

    return res.json({
      success: true,
      message: 'Şifre başarıyla değiştirildi'
    });

  } catch (error) {
    logError('Change password error:', error);
    return res.status(500).json({
      success: false,
      error: 'Şifre değiştirilirken hata oluştu'
    });
  }
}; 