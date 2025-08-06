import { Router } from 'express';
import {
  login,
  register,
  getProfile,
  changePassword,
  loginValidation,
  registerValidation
} from './controller';
import { authMiddleware } from '../../shared/middleware/auth';

const router = Router();

// Public routes
router.post('/login', loginValidation, login);
router.post('/register', registerValidation, register);

// Protected routes
router.get('/profile', authMiddleware, getProfile);
router.put('/change-password', authMiddleware, changePassword);

export default router; 