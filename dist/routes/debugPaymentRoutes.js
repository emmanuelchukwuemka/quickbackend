"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const debugPaymentController_1 = require("../controllers/debugPaymentController");
const adminAuthMiddleware_1 = require("../middleware/adminAuthMiddleware");
const router = (0, express_1.Router)();
router.use(adminAuthMiddleware_1.requireAdminAuth);
router.get('/driver/:driverId', debugPaymentController_1.listDriverPaymentTransactions);
exports.default = router;
