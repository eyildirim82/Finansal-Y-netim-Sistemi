import { Router } from 'express';
import { CashController } from './controller';

const router = Router();
const controller = new CashController();

// Kasa akışı oluşturma
router.post('/flows', controller.createCashFlow.bind(controller));

// Kasa akışları listesi
router.get('/flows', controller.getCashFlows.bind(controller));

// Güncel kasa durumu
router.get('/balance', controller.getCurrentBalance.bind(controller));

// Kasa sayımı
router.post('/count', controller.countCash.bind(controller));

// Kasa raporu
router.get('/report', controller.getCashReport.bind(controller));

// Kasa işlemi ekleme
router.post('/transactions', controller.addCashTransaction.bind(controller));

// Kasa işlemleri listesi
router.get('/transactions', controller.getCashTransactions.bind(controller));

export default router; 