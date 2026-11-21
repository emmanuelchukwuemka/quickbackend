"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const callController_1 = require("../controllers/callController");
const router = (0, express_1.Router)();
router.post('/:callId/decline', callController_1.declineCall);
exports.default = router;
