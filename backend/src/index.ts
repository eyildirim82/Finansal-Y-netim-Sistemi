import './shared/logger';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { configurePrismaDecimalJson } from './shared/prismaDecimalJson';

// Route'ları import et
import authRoutes from './modules/auth/routes';
import transactionRoutes from './modules/transactions/routes';
import customerRoutes from './modules/customers/routes';
import categoryRoutes from './modules/categories/routes';
import importRoutes from './modules/imports/routes';
import reportRoutes from './modules/reports/routes';
import extractRoutes from './modules/extracts/routes';
import bankingRoutes from './modules/banking/routes';
import cashRoutes from './modules/cash/routes';

// Middleware'leri import et
import { errorHandler } from './shared/middleware/errorHandler';
import { authMiddleware } from './shared/middleware/auth';

// Environment variables
dotenv.config();

// Keep the existing numeric JSON contract while PostgreSQL stores money as DECIMAL.
configurePrismaDecimalJson();

const app = express();
const PORT = process.env.PORT || 3001;

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 100, // IP başına maksimum 100 istek
  message: 'Çok fazla istek gönderildi. Lütfen daha sonra tekrar deneyin.'
});

// Middleware'ler
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(compression());
app.use(limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/imports', importRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/extracts', extractRoutes);
app.use('/api/banking', bankingRoutes);
app.use('/api/cash', cashRoutes);

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Endpoint bulunamadı',
    path: req.originalUrl 
  });
});

// Sunucuyu başlat
app.listen(PORT, () => {
  console.log(`🚀 Finansal Yönetim Sistemi Backend ${PORT} portunda çalışıyor`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
});

export default app;
