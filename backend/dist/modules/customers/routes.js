"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const controller_1 = require("./controller");
const auth_1 = require("../../shared/middleware/auth");
const router = (0, express_1.Router)();
const customerController = new controller_1.CustomerController();
router.use(auth_1.authMiddleware);
router.get('/', customerController.getCustomers);
router.get('/stats', customerController.getCustomerStats);
router.get('/search', customerController.searchCustomers);
router.get('/overdue', customerController.getOverdueCustomers);
router.post('/', customerController.createCustomer);
router.delete('/all', customerController.deleteAllCustomers);
router.get('/:id', customerController.getCustomerById);
router.put('/:id', customerController.updateCustomer);
router.delete('/:id', customerController.deleteCustomer);
exports.default = router;
//# sourceMappingURL=routes.js.map