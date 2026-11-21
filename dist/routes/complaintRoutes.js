"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const complaintController_1 = require("../controllers/complaintController");
const adminAuthMiddleware_1 = require("../middleware/adminAuthMiddleware");
const router = (0, express_1.Router)();
// Public — for the rider/driver app to file complaints against.
router.post('/', complaintController_1.fileComplaint);
// Admin-only management.
router.get('/', adminAuthMiddleware_1.requireAdminAuth, complaintController_1.listComplaints);
router.put('/:id', adminAuthMiddleware_1.requireAdminAuth, complaintController_1.updateComplaint);
exports.default = router;
