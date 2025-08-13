import { Router } from 'express';
import { CustomerController } from './controller';
import { authMiddleware } from '../../shared/middleware/auth';

const router = Router();
const customerController = new CustomerController();

// Tüm route'lar için authentication gerekli
router.use(authMiddleware);

// Müşteri CRUD işlemleri
router.get('/', customerController.getCustomers);
router.get('/search', customerController.searchCustomers);
router.get('/overdue', customerController.getOverdueCustomers);
router.get('/:id', customerController.getCustomerById);
router.post('/', customerController.createCustomer);
router.put('/:id', customerController.updateCustomer);
router.delete('/:id', customerController.deleteCustomer);

export default router; 