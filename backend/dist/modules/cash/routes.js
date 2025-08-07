"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const controller_1 = require("./controller");
const router = (0, express_1.Router)();
const controller = new controller_1.CashController();
router.post('/flows', controller.createCashFlow.bind(controller));
router.get('/flows', controller.getCashFlows.bind(controller));
router.get('/balance', controller.getCurrentBalance.bind(controller));
router.post('/count', controller.countCash.bind(controller));
router.get('/report', controller.getCashReport.bind(controller));
router.post('/transactions', controller.addCashTransaction.bind(controller));
router.get('/transactions', controller.getCashTransactions.bind(controller));
exports.default = router;
//# sourceMappingURL=routes.js.map