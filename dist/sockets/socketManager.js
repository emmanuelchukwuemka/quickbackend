"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initSockets = exports.getDriverSocket = exports.getUserSocket = exports.getIO = exports.driverSockets = exports.userSockets = void 0;
const Driver_1 = __importDefault(require("../models/Driver"));
const User_1 = __importDefault(require("../models/User"));
const Ride_1 = __importDefault(require("../models/Ride"));
let ioInstance;
exports.userSockets = new Map();
exports.driverSockets = new Map();
const pendingCallOffers = new Map();
const pendingCallOfferKey = (toRole, toId) => `${toRole}:${toId}`;
const CALL_RING_TIMEOUT_MS = 5 * 60 * 1000;
// How long to wait after a passenger's socket drops before treating it as a
// real departure rather than a transient network blip.
const DISCONNECT_GRACE_MS = 20 * 1000;
const getIO = () => {
    if (!ioInstance) {
        if (process.env.NODE_ENV === 'test') {
            return { to: () => ({ emit: () => { } }), emit: () => { } };
        }
        throw new Error('Socket.io not initialized!');
    }
    return ioInstance;
};
exports.getIO = getIO;
const getUserSocket = (userId) => exports.userSockets.get(userId);
exports.getUserSocket = getUserSocket;
const getDriverSocket = (driverId) => exports.driverSockets.get(driverId);
exports.getDriverSocket = getDriverSocket;
const cancelSearchingRidesForPassenger = async (passengerId, io) => {
    const searchingRides = await Ride_1.default.find({
        passenger_ref: passengerId,
        status: { $in: ['searching', 'requested', 'Pending'] },
    });
    for (const ride of searchingRides) {
        const cancelled = await Ride_1.default.findByIdAndUpdate(ride.id, { status: 'Cancelled', cancelled_at: new Date() }, { new: true });
        if (!cancelled)
            continue;
        for (const [, socketId] of exports.driverSockets.entries()) {
            io.to(socketId).emit('ride_cancelled', { rideId: cancelled.id });
        }
    }
};
const initSockets = (io) => {
    ioInstance = io;
    io.on('connection', (socket) => {
        console.log(`[Socket] Client connected: ${socket.id}`);
        // Registration event to map DB IDs to Socket IDs
        socket.on('register', (data) => {
            if (data.role === 'driver') {
                exports.driverSockets.set(data.id, socket.id);
                console.log(`[Socket] Driver registered: ${data.id} -> ${socket.id}`);
            }
            else {
                exports.userSockets.set(data.id, socket.id);
                console.log(`[Socket] Passenger registered: ${data.id} -> ${socket.id}`);
            }
            // Redeliver any call that arrived while this device was disconnected
            // (locked/backgrounded) and couldn't be relayed live.
            const key = pendingCallOfferKey(data.role, data.id);
            const pending = pendingCallOffers.get(key);
            if (pending) {
                pendingCallOffers.delete(key);
                if (pending.expiresAt > Date.now()) {
                    socket.emit('call_offer', pending.data);
                    console.log(`[Socket] Pending call_offer redelivered to ${data.role} ${data.id}`);
                }
            }
        });
        // Driver updates location
        socket.on('updateLocation', async (data) => {
            try {
                const { driverId, lat, lng } = data;
                // The app sends the driver's string uid here, not their numeric id —
                // findByIdAndUpdate only matches on id, so this was silently failing
                // to persist every single location update (the real-time relay to
                // the passenger below still worked, but the stored location never
                // actually changed, leaving the poll-fallback permanently stale).
                const driver = await Driver_1.default.findOne({ $or: [{ id: driverId }, { uid: driverId }] });
                if (driver?.id) {
                    await Driver_1.default.findByIdAndUpdate(driver.id, {
                        location: {
                            type: 'Point',
                            coordinates: [lng, lat]
                        }
                    });
                }
                // Find if this driver is currently on an active ride
                const activeRide = await Ride_1.default.findOne({
                    driver_ref: driverId,
                    status: { $in: ['accepted', 'In_progress', 'in_progress'] }
                });
                if (activeRide) {
                    const passengerSocketId = (0, exports.getUserSocket)(activeRide.passenger_ref.toString());
                    if (passengerSocketId) {
                        // Forward driver's live location to the passenger
                        io.to(passengerSocketId).emit('driverLocationUpdated', { driverId, lat, lng });
                    }
                }
            }
            catch (err) {
                console.error('[Socket] Error updating driver location:', err);
            }
        });
        // User updates location
        socket.on('updateUserLocation', async (data) => {
            try {
                const { userId, lat, lng } = data;
                // Same id/uid mismatch as updateLocation above.
                const user = await User_1.default.findOne({ $or: [{ id: userId }, { uid: userId }] });
                if (user?.id) {
                    await User_1.default.findByIdAndUpdate(user.id, {
                        location: {
                            type: 'Point',
                            coordinates: [lng, lat]
                        }
                    });
                }
            }
            catch (err) {
                console.error('[Socket] Error updating user location:', err);
            }
        });
        // In-app chat relay — forward message to the other party in the ride
        socket.on('chat_message', async (data) => {
            try {
                const targetSocketId = data.toRole === 'driver'
                    ? exports.driverSockets.get(data.toId)
                    : exports.userSockets.get(data.toId);
                if (targetSocketId) {
                    io.to(targetSocketId).emit('chat_message', data);
                    console.log(`[Socket] Chat relayed to ${data.toRole} ${data.toId}`);
                }
                // Send FCM push notification so it pops up as alert
                try {
                    const { query } = await Promise.resolve().then(() => __importStar(require('../db')));
                    const { sendPushToTokens } = await Promise.resolve().then(() => __importStar(require('../firebase')));
                    let fcmToken = '';
                    if (data.toRole === 'driver') {
                        const row = await query("SELECT fcm_token FROM drivers WHERE uid = $1 OR id::text = $2 LIMIT 1", [data.toId, data.toId]);
                        fcmToken = row.rows[0]?.fcm_token;
                    }
                    else {
                        const row = await query("SELECT fcm_token FROM users WHERE uid = $1 OR id::text = $2 LIMIT 1", [data.toId, data.toId]);
                        fcmToken = row.rows[0]?.fcm_token;
                    }
                    if (fcmToken) {
                        await sendPushToTokens([fcmToken], data.senderName, data.message, {
                            rideId: data.rideId,
                            type: 'chat_message',
                            message: data.message,
                            senderName: data.senderName,
                            // So a killed/locked recipient's app can open straight to
                            // this thread without guessing who the other party is.
                            fromId: data.senderId,
                            fromRole: data.toRole === 'driver' ? 'passenger' : 'driver',
                        });
                    }
                }
                catch (fcmErr) {
                    console.warn('[Socket] FCM push chat relay error:', fcmErr);
                }
            }
            catch (err) {
                console.error('[Socket] chat_message error:', err);
            }
        });
        // In-app voice call signaling — this server only relays WebRTC
        // offer/answer/ICE messages between the two parties, it never inspects
        // or stores call content.
        const getTargetSocket = (toId, toRole) => toRole === 'driver' ? exports.driverSockets.get(toId) : exports.userSockets.get(toId);
        socket.on('call_offer', async (data) => {
            try {
                const targetSocketId = getTargetSocket(data.toId, data.toRole);
                const sendWakePush = async () => {
                    try {
                        const { query } = await Promise.resolve().then(() => __importStar(require('../db')));
                        const { sendPushToTokens } = await Promise.resolve().then(() => __importStar(require('../firebase')));
                        const table = data.toRole === 'driver' ? 'drivers' : 'users';
                        const row = await query(`SELECT fcm_token FROM ${table} WHERE uid = $1 OR id::text = $2 LIMIT 1`, [data.toId, data.toId]);
                        const fcmToken = row.rows[0]?.fcm_token;
                        if (!fcmToken)
                            return false;
                        await sendPushToTokens([fcmToken], `Incoming call from ${data.fromName}`, 'Tap to answer', {
                            rideId: data.rideId,
                            callId: data.callId,
                            type: 'incoming_call',
                            // So the callee's device can show a full-screen ringing UI
                            // and — if declined right from that screen — tell the
                            // caller without ever opening the app.
                            fromId: data.fromId,
                            fromRole: data.fromRole,
                            fromName: data.fromName,
                        });
                        return true;
                    }
                    catch (fcmErr) {
                        console.warn('[Socket] FCM push call_offer error:', fcmErr);
                        return false;
                    }
                };
                if (!targetSocketId) {
                    // Not connected right now (locked/backgrounded/killed) — hold the
                    // offer so it can be redelivered the instant they reconnect
                    // (see the `register` handler), and try to wake them with a push
                    // in the meantime instead of giving up immediately.
                    pendingCallOffers.set(pendingCallOfferKey(data.toRole, data.toId), {
                        data,
                        expiresAt: Date.now() + CALL_RING_TIMEOUT_MS,
                    });
                    const pushed = await sendWakePush();
                    if (!pushed) {
                        socket.emit('call_unavailable', { callId: data.callId, toId: data.toId });
                    }
                    return;
                }
                io.to(targetSocketId).emit('call_offer', data);
                console.log(`[Socket] call_offer relayed to ${data.toRole} ${data.toId}`);
                // Also push even though the socket is live, so a backgrounded (but
                // still connected) app can raise a heads-up alert.
                await sendWakePush();
            }
            catch (err) {
                console.error('[Socket] call_offer error:', err);
            }
        });
        socket.on('call_answer', (data) => {
            const targetSocketId = getTargetSocket(data.toId, data.toRole);
            if (targetSocketId)
                io.to(targetSocketId).emit('call_answer', data);
        });
        socket.on('call_ice_candidate', (data) => {
            const targetSocketId = getTargetSocket(data.toId, data.toRole);
            if (targetSocketId)
                io.to(targetSocketId).emit('call_ice_candidate', data);
        });
        socket.on('call_reject', (data) => {
            const targetSocketId = getTargetSocket(data.toId, data.toRole);
            if (targetSocketId)
                io.to(targetSocketId).emit('call_reject', data);
        });
        socket.on('call_end', (data) => {
            const targetSocketId = getTargetSocket(data.toId, data.toRole);
            if (targetSocketId)
                io.to(targetSocketId).emit('call_end', data);
        });
        socket.on('disconnect', () => {
            console.log(`[Socket] Client disconnected: ${socket.id}`);
            // Remove from maps if exists
            const disconnectedPassengerIds = [];
            for (const [key, value] of exports.userSockets.entries()) {
                if (value === socket.id) {
                    exports.userSockets.delete(key);
                    disconnectedPassengerIds.push(key);
                }
            }
            for (const [key, value] of exports.driverSockets.entries()) {
                if (value === socket.id)
                    exports.driverSockets.delete(key);
            }
            for (const passengerId of disconnectedPassengerIds) {
                // Mobile connections drop and reconnect constantly (a signal blip, a
                // WiFi/cellular handoff, the OS briefly suspending the socket) —
                // Socket.IO clients recover from these in a second or two on their
                // own. Cancelling the instant the transport drops treated a normal
                // reconnect as "the passenger left" and cancelled their search out
                // from under them. Wait, then only cancel if they're still gone.
                setTimeout(() => {
                    if (exports.userSockets.has(passengerId))
                        return; // reconnected — nothing to do
                    cancelSearchingRidesForPassenger(passengerId, io).catch((err) => {
                        console.error('[Socket] Failed to cancel searching rides for disconnected passenger:', err);
                    });
                }, DISCONNECT_GRACE_MS);
            }
        });
    });
};
exports.initSockets = initSockets;
