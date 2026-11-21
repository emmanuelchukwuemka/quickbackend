"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const paymentGatewayController_1 = require("../controllers/paymentGatewayController");
const router = (0, express_1.Router)();
// Unauthenticated by necessity: Paystack itself calls verify/webhook, and
// the driver app has no auth layer to attach here either (matching the rest
// of this API's existing posture). Nothing here can credit a wallet without
// a real, Paystack-verified reference. Passengers never pay through the
// app — this is driver wallet top-up only.
router.post('/drivers/:id/wallet/topup/init', paymentGatewayController_1.initWalletTopup);
router.get('/verify/:reference', paymentGatewayController_1.verifyPayment);
router.post('/webhook', paymentGatewayController_1.paystackWebhook);
exports.default = router;
