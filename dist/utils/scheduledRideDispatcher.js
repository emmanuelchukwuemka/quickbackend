"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dispatchScheduledRides = void 0;
const db_1 = require("../db");
const Ride_1 = __importDefault(require("../models/Ride"));
const socketManager_1 = require("../sockets/socketManager");
const firebase_1 = require("../firebase");
// Build a ride payload matching what requestRide creates
function buildRidePayload(sr, extra = {}) {
    const ridePayload = {
        passenger_ref: sr.passenger_ref || null,
        pickup_address: sr.pickup_address || '',
        dropoff_address: sr.dropoff_address || '',
        final_fare: Number(sr.estimated_fare) || 0,
        ride_type: 'scheduled',
        requested_at: new Date(),
        ...extra,
    };
    if (sr.pickup_lat && sr.pickup_lng) {
        ridePayload.pickup = {
            type: 'Point',
            coordinates: [Number(sr.pickup_lng), Number(sr.pickup_lat)],
            lat: Number(sr.pickup_lat),
            lng: Number(sr.pickup_lng),
        };
        ridePayload.pickup_lat = Number(sr.pickup_lat);
        ridePayload.pickup_lng = Number(sr.pickup_lng);
    }
    if (sr.dropoff_lat && sr.dropoff_lng) {
        ridePayload.dropoff = {
            type: 'Point',
            coordinates: [Number(sr.dropoff_lng), Number(sr.dropoff_lat)],
            lat: Number(sr.dropoff_lat),
            lng: Number(sr.dropoff_lng),
        };
        ridePayload.dropoff_lat = Number(sr.dropoff_lat);
        ridePayload.dropoff_lng = Number(sr.dropoff_lng);
    }
    return ridePayload;
}
const dispatchScheduledRides = async () => {
    await dispatchOpenScheduledRides();
    await dispatchPreAcceptedScheduledRides();
};
exports.dispatchScheduledRides = dispatchScheduledRides;
// Scheduled rides nobody accepted ahead of time — open them up to any
// available driver, same as a normal ride request.
const dispatchOpenScheduledRides = async () => {
    try {
        // Find due rides, then immediately mark them 'Dispatching' so this single
        // background interval never double-processes the same row on the next tick.
        const due = await (0, db_1.query)(`SELECT * FROM scheduled_rides
       WHERE LOWER(status) = 'pending'
         AND scheduled_time <= NOW() + INTERVAL '1 minute'
         AND scheduled_time >= NOW() - INTERVAL '60 minutes'`);
        if (!due.rowCount || due.rowCount === 0)
            return;
        const dueIds = due.rows.map((r) => r.id);
        const idPlaceholders = dueIds.map((_, i) => `$${i + 1}`).join(', ');
        await (0, db_1.query)(`UPDATE scheduled_rides SET status = 'Dispatching' WHERE id IN (${idPlaceholders})`, dueIds);
        console.log(`[Scheduler] Dispatching ${due.rowCount} open scheduled ride(s)`);
        for (const sr of due.rows) {
            try {
                const ride = new Ride_1.default(buildRidePayload(sr, { status: 'searching' }));
                const savedRide = await ride.save();
                const savedRideId = savedRide.id;
                if (!savedRideId) {
                    throw new Error('Scheduled ride dispatch created a ride without an id');
                }
                const rideData = { ...savedRide, _id: savedRideId };
                // Save the created ride reference on the scheduled_rides row
                await (0, db_1.query)(`UPDATE scheduled_rides SET status = 'Dispatched', ride_ref = $1 WHERE id = $2`, [savedRideId, sr.id]);
                // Broadcast new_ride_offer to all available connected drivers
                try {
                    const io = (0, socketManager_1.getIO)();
                    const activeStatuses = ['accepted', 'in_progress', 'In_progress', 'arrived'];
                    let sent = 0;
                    for (const [driverId, socketId] of socketManager_1.driverSockets.entries()) {
                        const busy = await Ride_1.default.findOne({ driver_ref: driverId, status: { $in: activeStatuses } });
                        if (busy)
                            continue;
                        io.to(socketId).emit('new_ride_offer', { ride: rideData });
                        sent++;
                    }
                    console.log(`[Scheduler] Sent new_ride_offer to ${sent} driver(s) for scheduled ride ${sr.id}`);
                }
                catch (socketErr) {
                    console.warn('[Scheduler] Socket emit error:', socketErr);
                }
                // FCM push to all online drivers
                try {
                    const tokenRows = await (0, db_1.query)(`SELECT fcm_token FROM drivers WHERE is_online = 'Online' AND fcm_token IS NOT NULL AND fcm_token != ''`);
                    const tokens = tokenRows.rows.map((r) => r.fcm_token).filter(Boolean);
                    if (tokens.length > 0) {
                        await (0, firebase_1.sendPushToTokens)(tokens, 'Scheduled Ride Ready', `Pickup: ${sr.pickup_address || 'Nearby location'}`, { rideId: savedRideId });
                    }
                }
                catch (fcmErr) {
                    console.warn('[Scheduler] FCM push error:', fcmErr);
                }
                console.log(`[Scheduler] Scheduled ride ${sr.id} -> live ride ${savedRideId}`);
            }
            catch (err) {
                console.error(`[Scheduler] Error dispatching scheduled ride ${sr.id}:`, err.message);
                // Revert so it can be retried on next tick
                await (0, db_1.query)(`UPDATE scheduled_rides SET status = 'Pending' WHERE id = $1`, [sr.id]);
            }
        }
    }
    catch (err) {
        console.error('[Scheduler] dispatchOpenScheduledRides error:', err.message);
    }
};
// Scheduled rides a driver already accepted ahead of time — hand the live
// ride directly to that driver instead of broadcasting it to everyone.
const dispatchPreAcceptedScheduledRides = async () => {
    try {
        const due = await (0, db_1.query)(`SELECT * FROM scheduled_rides
       WHERE LOWER(status) = 'accepted'
         AND driver_ref IS NOT NULL
         AND ride_ref IS NULL
         AND scheduled_time <= NOW() + INTERVAL '1 minute'
         AND scheduled_time >= NOW() - INTERVAL '60 minutes'`);
        if (!due.rowCount || due.rowCount === 0)
            return;
        const dueIds = due.rows.map((r) => r.id);
        const idPlaceholders = dueIds.map((_, i) => `$${i + 1}`).join(', ');
        await (0, db_1.query)(`UPDATE scheduled_rides SET status = 'Dispatching' WHERE id IN (${idPlaceholders})`, dueIds);
        console.log(`[Scheduler] Dispatching ${due.rowCount} pre-accepted scheduled ride(s)`);
        for (const sr of due.rows) {
            try {
                const ride = new Ride_1.default(buildRidePayload(sr, {
                    status: 'accepted',
                    driver_ref: sr.driver_ref,
                    accepted_at: new Date(),
                }));
                const savedRide = await ride.save();
                const savedRideId = savedRide.id;
                if (!savedRideId) {
                    throw new Error('Scheduled ride dispatch created a ride without an id');
                }
                const rideData = { ...savedRide, _id: savedRideId };
                await (0, db_1.query)(`UPDATE scheduled_rides SET status = 'Dispatched', ride_ref = $1 WHERE id = $2`, [savedRideId, sr.id]);
                // Let the passenger know their driver is on the way, same as a normal accept
                try {
                    const passengerSocketId = sr.passenger_ref ? (0, socketManager_1.getUserSocket)(sr.passenger_ref.toString()) : undefined;
                    if (passengerSocketId) {
                        (0, socketManager_1.getIO)().to(passengerSocketId).emit('ride_accepted', { ride: rideData, driver_ref: sr.driver_ref });
                    }
                }
                catch (socketErr) {
                    console.warn('[Scheduler] Passenger socket emit error:', socketErr);
                }
                // Let the driver know their scheduled ride just went live (their
                // dashboard's active-ride poll will also pick this up within ~12s)
                try {
                    const driverSocketId = (0, socketManager_1.getDriverSocket)(sr.driver_ref.toString());
                    if (driverSocketId) {
                        (0, socketManager_1.getIO)().to(driverSocketId).emit('ride_accepted', { ride: rideData });
                    }
                }
                catch (socketErr) {
                    console.warn('[Scheduler] Driver socket emit error:', socketErr);
                }
                try {
                    const [passengerRow, driverRow] = await Promise.all([
                        sr.passenger_ref
                            ? (0, db_1.query)(`SELECT fcm_token FROM users WHERE id::text = $1 OR uid = $1 LIMIT 1`, [sr.passenger_ref.toString()])
                            : null,
                        (0, db_1.query)(`SELECT fcm_token FROM drivers WHERE id::text = $1 OR uid = $1 LIMIT 1`, [sr.driver_ref.toString()]),
                    ]);
                    const passengerToken = passengerRow?.rows[0]?.fcm_token;
                    const driverToken = driverRow.rows[0]?.fcm_token;
                    if (passengerToken) {
                        await (0, firebase_1.sendPushToTokens)([passengerToken], 'Driver On The Way!', 'Your scheduled ride is starting — your driver is on the way.', { rideId: savedRideId, type: 'ride_accepted' });
                    }
                    if (driverToken) {
                        await (0, firebase_1.sendPushToTokens)([driverToken], 'Scheduled Ride Starting', `Pickup: ${sr.pickup_address || 'Your scheduled pickup'}`, { rideId: savedRideId, type: 'ride_accepted' });
                    }
                }
                catch (fcmErr) {
                    console.warn('[Scheduler] FCM push error:', fcmErr);
                }
                console.log(`[Scheduler] Pre-accepted scheduled ride ${sr.id} -> live ride ${savedRideId} for driver ${sr.driver_ref}`);
            }
            catch (err) {
                console.error(`[Scheduler] Error dispatching pre-accepted scheduled ride ${sr.id}:`, err.message);
                // Revert so it can be retried on next tick
                await (0, db_1.query)(`UPDATE scheduled_rides SET status = 'Accepted' WHERE id = $1`, [sr.id]);
            }
        }
    }
    catch (err) {
        console.error('[Scheduler] dispatchPreAcceptedScheduledRides error:', err.message);
    }
};
