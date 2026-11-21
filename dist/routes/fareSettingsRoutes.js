"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const fareSettingsController_1 = require("../controllers/fareSettingsController");
const adminAuthMiddleware_1 = require("../middleware/adminAuthMiddleware");
const router = (0, express_1.Router)();
// GET is public (read by the rider/driver apps); only PUT requires admin auth.
router.get('/', fareSettingsController_1.getFareSettings);
router.put('/', adminAuthMiddleware_1.requireAdminAuth, fareSettingsController_1.updateFareSettings);
exports.default = router;
