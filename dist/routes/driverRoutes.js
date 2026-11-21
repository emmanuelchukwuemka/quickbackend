"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const driverController_1 = require("../controllers/driverController");
const walletController_1 = require("../controllers/walletController");
const adminAuthMiddleware_1 = require("../middleware/adminAuthMiddleware");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
router.put('/fcm-token', driverController_1.saveFcmToken);
// Must come before /:id below — otherwise Express matches "me" as an :id
// and routes it to the admin-only deleteDriver handler instead.
router.delete('/me', authMiddleware_1.verifyToken, driverController_1.deleteOwnAccount);
router.get('/', driverController_1.getAllDrivers);
router.get('/:id', driverController_1.getDriverById);
router.post('/', driverController_1.createDriver);
router.put('/:id', driverController_1.updateDriver);
router.delete('/:id', adminAuthMiddleware_1.requireAdminAuth, driverController_1.deleteDriver);
router.post('/:id/documents', driverController_1.uploadDocuments);
// Manual credit — admin-only. Real driver-initiated top-ups go through the
// Paystack flow (see paymentGatewayRoutes.ts), which is unauthenticated by
// necessity (Paystack itself calls the verify/webhook endpoints) but only
// ever credits a wallet after a verified real payment.
router.post('/:id/wallet/topup', adminAuthMiddleware_1.requireAdminAuth, walletController_1.fundDriverWallet);
router.get('/:id/wallet/transactions', walletController_1.getWalletTransactions);
exports.default = router;
