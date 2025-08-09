import { logError } from '../logger';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Request interface'ini genişlet
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Token'ı header'dan al
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Yetkilendirme token\'ı gerekli'
      });
    }

    const token = authHeader.substring(7); // "Bearer " kısmını çıkar

    // Token'ı doğrula
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

    // Kullanıcıyı veritabanından kontrol et
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

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Geçersiz veya pasif kullanıcı'
      });
    }

    // Kullanıcıyı request'e ekle
    req.user = user;
    return next();

  } catch (error) {
    logError('Auth middleware error:', error);
    
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        success: false,
        error: 'Geçersiz token'
      });
    }

    if (error instanceof jwt.TokenExpiredError) {
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

// Admin yetkisi kontrolü
export const adminMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      error: 'Admin yetkisi gerekli'
    });
  }
  return next();
};

// Rol tabanlı yetkilendirme
export const roleMiddleware = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Bu işlem için yetkiniz yok'
      });
    }
    return next();
  };
}; 