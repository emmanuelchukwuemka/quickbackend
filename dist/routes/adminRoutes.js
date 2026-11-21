"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const adminController_1 = require("../controllers/adminController");
const walletController_1 = require("../controllers/walletController");
const adminAuthMiddleware_1 = require("../middleware/adminAuthMiddleware");
const router = (0, express_1.Router)();
router.use(adminAuthMiddleware_1.requireAdminAuth);
// PUT approve a driver
router.put('/driver/:id/approve', adminController_1.approveDriver);
// PUT reject a driver
router.put('/driver/:id/reject', adminController_1.rejectDriver);
// PUT suspend / reactivate a driver
router.put('/driver/:id/suspend', adminController_1.suspendDriver);
router.put('/driver/:id/reactivate', adminController_1.reactivateDriver);
// PUT suspend / reactivate a passenger
router.put('/passenger/:id/suspend', adminController_1.suspendPassenger);
router.put('/passenger/:id/reactivate', adminController_1.reactivatePassenger);
// GET platform-wide wallet totals (commission earned, driver top-ups) + a
// daily-bucketed window for charting.
router.get('/wallet-summary', walletController_1.getWalletSummary);
exports.default = router;
