"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.declineCall = void 0;
const socketManager_1 = require("../sockets/socketManager");
// Lets a callee decline an in-app voice call without ever opening the app —
// used by the Decline action on the background full-screen incoming-call
// notification, which only has plain HTTP available (no live socket in a
// background isolate). Best-effort, same as the socket call_reject handler:
// if the caller isn't connected there's nothing more to notify.
const declineCall = async (req, res) => {
    try {
        const { callId } = req.params;
        const { toId, toRole } = req.body;
        if (!callId || !toId || !toRole) {
            return res.status(400).json({ message: 'callId, toId and toRole are required' });
        }
        const targetSocketId = toRole === 'driver' ? socketManager_1.driverSockets.get(toId) : socketManager_1.userSockets.get(toId);
        if (targetSocketId) {
            (0, socketManager_1.getIO)().to(targetSocketId).emit('call_reject', { callId, toId, toRole, reason: 'declined' });
        }
        res.json({ message: 'Call declined' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.declineCall = declineCall;
