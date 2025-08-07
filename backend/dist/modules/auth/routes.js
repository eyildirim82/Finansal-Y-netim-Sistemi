"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const controller_1 = require("./controller");
const auth_1 = require("../../shared/middleware/auth");
const router = (0, express_1.Router)();
router.post('/login', controller_1.loginValidation, controller_1.login);
router.post('/register', controller_1.registerValidation, controller_1.register);
router.get('/profile', auth_1.authMiddleware, controller_1.getProfile);
router.put('/change-password', auth_1.authMiddleware, controller_1.changePassword);
exports.default = router;
//# sourceMappingURL=routes.js.map