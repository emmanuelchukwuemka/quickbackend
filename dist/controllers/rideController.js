"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDriverRideHistory = exports.getUserRideHistory = exports.cancelRide = exports.rateRide = exports.completeRide = exports.startRide = exports.acceptRide = exports.requestRide = exports.arriveRide = exports.getRideById = void 0;
const Ride_1 = __importDefault(require("../models/Ride"));
const Driver_1 = __importDefault(require("../models/Driver"));
const User_1 = __importDefault(require("../models/User"));
const FareSettings_1 = __importDefault(require("../models/FareSettings"));
const WalletTransaction_1 = __importDefault(require("../models/WalletTransaction"));
const db_1 = require("../db");
const socketManager_1 = require("../sockets/socketManager");
const firebase_1 = require("../firebase");
const fare_1 = require("../utils/fare");
const mapsService_1 = require("../utils/mapsService");
const displayName_1 = require("../utils/displayName");
const resolveDriver = (driverRef) => Driver_1.default.findOne({ $or: [{ id: driverRef }, { uid: driverRef }] });
const toEstimatedMinutes = (value) => {
    const num = Number(value);
    return Number.isFinite(num) && num > 0 ? Math.ceil(num) : null;
};
const buildRideResponse = (ride) => {
    const estimatedMinutes = toEstimatedMinutes(ride.time);
    return {
        ...ride,
        _id: ride.id,
        fare: ride.final_fare ?? 0,
        estimated_time: estimatedMinutes,
        estimatedTime: estimatedMinutes,
        duration: estimatedMinutes,
        distance: ride.distanceKm ?? 0,
    };
};
const getRideById = async (req, res) => {
    try {
        const id = req.params.id;
        // Join with users to get passenger display_name and phone
        const result = await (0, db_1.query)(`SELECT r.*,
              u.display_name AS passenger_name, u.phone_number AS passenger_phone,
              d.display_name AS driver_name,    d.phone_number AS driver_phone,
              d.driver_rating AS driver_rating
       FROM rides r
       LEFT JOIN users   u ON (r.passenger_ref = u.id::text OR r.passenger_ref = u.uid)
       LEFT JOIN drivers d ON (r.driver_ref    = d.id::text OR r.driver_ref    = d.uid)
       WHERE r.id = $1 LIMIT 1`, [id]);
        if (!result.rowCount)
            return res.status(404).json({ message: 'Ride not found' });
        const row = result.rows[0];
        const estimatedMinutes = toEstimatedMinutes(row.time);
        const ride = {
            id: row.id,
            _id: row.id,
            passenger_ref: row.passenger_ref,
            driver_ref: row.driver_ref,
            status: row.status,
            ride_type: row.ride_type,
            payment_method: row.payment_method,
            final_fare: Number(row.final_fare),
            fare: Number(row.final_fare),
            distanceKm: Number(row.distancekm ?? row.distanceKm ?? 0),
            pickup_lat: Number(row.pickup_lat),
            pickup_lng: Number(row.pickup_lng),
            dropoff_lat: Number(row.dropoff_lat),
            dropoff_lng: Number(row.dropoff_lng),
            pickup_address: row.pickup_address || '',
            dropoff_address: row.dropoff_address || '',
            passenger_name: row.passenger_name || '',
            passenger_phone: row.passenger_phone || '',
            driver_name: row.driver_name || '',
            driver_phone: row.driver_phone || '',
            driver_rating: row.driver_rating != null ? Number(row.driver_rating) : null,
            estimated_time: estimatedMinutes,
            estimatedTime: estimatedMinutes,
            duration: estimatedMinutes,
            requested_at: row.requested_at,
            accepted_at: row.accepted_at,
        };
        ride.passenger_name = (0, displayName_1.sanitizeDisplayName)(ride.passenger_name);
        ride.driver_name = (0, displayName_1.sanitizeDisplayName)(ride.driver_name);
        return res.json({ ride });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getRideById = getRideById;
const arriveRide = async (req, res) => {
    try {
        const id = req.params.id;
        const ride = await Ride_1.default.findByIdAndUpdate(id, { status: 'arrived' }, { new: true });
        if (!ride)
            return res.status(404).json({ message: 'Ride not found' });
        try {
            const passengerSocketId = (0, socketManager_1.getUserSocket)(ride.passenger_ref.toString());
            if (passengerSocketId) {
                (0, socketManager_1.getIO)().to(passengerSocketId).emit('driver_arrived', { rideId: id });
            }
        }
        catch (_) { }
        // FCM push notification to passenger
        try {
            if (ride.passenger_ref) {
                const passengerRow = await (0, db_1.query)(`SELECT fcm_token FROM users WHERE id::text = $1 OR uid = $1 LIMIT 1`, [ride.passenger_ref.toString()]);
                const fcmToken = passengerRow.rows[0]?.fcm_token;
                if (fcmToken) {
                    await (0, firebase_1.sendPushToTokens)([fcmToken], 'Driver Arrived!', 'Your driver has arrived at your location.', { rideId: id, type: 'driver_arrived' });
                }
            }
        }
        catch (fcmErr) {
            console.warn('[FCM] arriveRide push error:', fcmErr);
        }
        res.json({ ride: { ...ride, _id: ride.id } });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.arriveRide = arriveRide;
const requestRide = async (req, res) => {
    try {
        const ridePayload = { ...req.body };
        if (req.body.passenger_id && !req.body.passenger_ref) {
            ridePayload.passenger_ref = req.body.passenger_id;
        }
        if (ridePayload.passenger_ref) {
            const passenger = await User_1.default.findOne({ $or: [{ id: ridePayload.passenger_ref }, { uid: ridePayload.passenger_ref }] });
            if (passenger?.is_active === false) {
                return res.status(403).json({ message: 'Your account has been suspended.', code: 'PASSENGER_SUSPENDED' });
            }
        }
        if (req.body.pickupLat && req.body.pickupLng) {
            ridePayload.pickup = {
                type: 'Point',
                coordinates: [req.body.pickupLng, req.body.pickupLat],
                lat: req.body.pickupLat,
                lng: req.body.pickupLng
            };
        }
        if (req.body.dropoffLat && req.body.dropoffLng) {
            ridePayload.dropoff = {
                type: 'Point',
                coordinates: [req.body.dropoffLng, req.body.dropoffLat],
                lat: req.body.dropoffLat,
                lng: req.body.dropoffLng
            };
        }
        // Store address strings if provided by the client
        ridePayload.pickup_address = req.body.pickupAddress || req.body.pickup_address || '';
        ridePayload.dropoff_address = req.body.dropoffAddress || req.body.dropoff_address || '';
        ridePayload.distanceKm = Number(req.body.distanceKm ?? req.body.distance_km ?? 0) || 0;
        ridePayload.ride_type = (req.body.ride_type || ridePayload.ride_type || 'standard').toString();
        if (req.body.pickupLat && req.body.pickupLng && req.body.dropoffLat && req.body.dropoffLng) {
            const routeMetrics = (0, mapsService_1.calculateDistanceAndETA)({ lat: Number(req.body.pickupLat), lng: Number(req.body.pickupLng) }, { lat: Number(req.body.dropoffLat), lng: Number(req.body.dropoffLng) });
            if (!ridePayload.distanceKm || ridePayload.distanceKm <= 0) {
                ridePayload.distanceKm = routeMetrics.distanceKm;
            }
            ridePayload.time = String(routeMetrics.estimatedMinutes);
        }
        ridePayload.final_fare = await (0, fare_1.calculateRideFare)(ridePayload.distanceKm, ridePayload.ride_type);
        const saveRideAndBroadcast = async (payload) => {
            const ride = new Ride_1.default(payload);
            ride.status = 'searching';
            const savedRide = await ride.save();
            const rideData = buildRideResponse(savedRide);
            const walletMinimum = (await FareSettings_1.default.getSettings()).wallet_minimum_balance;
            try {
                const io = (0, socketManager_1.getIO)();
                const activeStatuses = ['accepted', 'in_progress', 'In_progress', 'arrived'];
                const driverIds = Array.from(socketManager_1.driverSockets.keys());
                // Previously this ran two separate DB queries per connected driver
                // socket, sequentially, before the passenger's "ride requested"
                // response could be sent - up to 2*N round-trips for N online
                // drivers, on every single ride request. Replaced with exactly two
                // bulk queries total, run in parallel, then filtered in memory.
                const statusPlaceholders = activeStatuses.map((_, i) => `$${i + 1}`).join(', ');
                const driverPlaceholders = driverIds.map((_, i) => `$${i + 1}`).join(', ');
                const [busyRows, eligibleRows] = await Promise.all([
                    (0, db_1.query)(`SELECT DISTINCT driver_ref FROM rides WHERE status IN (${statusPlaceholders})`, activeStatuses),
                    driverIds.length > 0
                        ? (0, db_1.query)(`SELECT id, uid, is_online, wallet_balance, verification_status FROM drivers WHERE id IN (${driverPlaceholders}) OR uid IN (${driverPlaceholders})`, driverIds)
                        : Promise.resolve({ rows: [] }),
                ]);
                const busyDriverRefs = new Set(busyRows.rows.map((r) => String(r.driver_ref)));
                const driverInfoByKey = new Map();
                for (const row of eligibleRows.rows) {
                    driverInfoByKey.set(String(row.id), row);
                    if (row.uid)
                        driverInfoByKey.set(String(row.uid), row);
                }
                let sent = 0;
                for (const [driverId, socketId] of socketManager_1.driverSockets.entries()) {
                    if (busyDriverRefs.has(String(driverId)))
                        continue;
                    const info = driverInfoByKey.get(String(driverId));
                    if (!info)
                        continue;
                    const isOnline = (info.is_online ?? '').toString().toLowerCase() === 'online';
                    if (!isOnline)
                        continue;
                    if ((info.verification_status ?? '') !== 'approved')
                        continue;
                    const walletBalance = Number(info.wallet_balance ?? 0);
                    if (walletBalance < walletMinimum)
                        continue;
                    io.to(socketId).emit('new_ride_offer', { ride: rideData });
                    sent++;
                }
                console.log(`[Socket] Broadcasted new_ride_offer to ${sent}/${socketManager_1.driverSockets.size} available driver(s)`);
            }
            catch (socketErr) {
                console.warn('[Socket] Could not emit new_ride_offer:', socketErr);
            }
            // FCM: push to online drivers who have a token stored and meet the wallet minimum
            try {
                const tokenRows = await (0, db_1.query)(`SELECT fcm_token FROM drivers WHERE is_online = 'Online' AND wallet_balance >= $1 AND verification_status = 'approved' AND fcm_token IS NOT NULL AND fcm_token != ''`, [walletMinimum]);
                const tokens = tokenRows.rows.map((r) => r.fcm_token).filter(Boolean);
                const pickup = rideData.pickup_address || 'Nearby location';
                await (0, firebase_1.sendPushToTokens)(tokens, 'New Ride Request', `Pickup: ${pickup}`, { rideId: String(rideData.id ?? rideData._id ?? '') });
            }
            catch (fcmErr) {
                console.warn('[FCM] push error:', fcmErr);
            }
            return rideData;
        };
        try {
            const rideData = await saveRideAndBroadcast(ridePayload);
            return res.status(201).json({ ride: rideData });
        }
        catch (saveError) {
            // FK constraint: passenger_ref not in users table (e.g. DB reset in dev)
            if (saveError.code === '23503' && ridePayload.passenger_ref) {
                console.warn(`[Ride] passenger_ref ${ridePayload.passenger_ref} not found — saving ride without it`);
                ridePayload.passenger_ref = null;
                const rideData = await saveRideAndBroadcast(ridePayload);
                return res.status(201).json({ ride: rideData });
            }
            throw saveError;
        }
    }
    catch (error) {
        console.error('[Ride] requestRide error:', error.message);
        res.status(500).json({ message: error.message });
    }
};
exports.requestRide = requestRide;
const acceptRide = async (req, res) => {
    try {
        const id = req.params.id;
        const driver_ref = req.body.driver_ref || req.body.driver_id;
        if (driver_ref) {
            const driver = await resolveDriver(driver_ref.toString());
            if (driver) {
                if (driver.is_active === false) {
                    return res.status(403).json({ message: 'Your account has been suspended.', code: 'DRIVER_SUSPENDED' });
                }
                if (driver.verification_status !== 'approved') {
                    return res.status(403).json({ message: 'Your account is not yet approved.', code: 'DRIVER_NOT_APPROVED' });
                }
                const walletMinimum = (await FareSettings_1.default.getSettings()).wallet_minimum_balance;
                if ((driver.wallet_balance ?? 0) < walletMinimum) {
                    return res.status(403).json({
                        message: `Fund your wallet with at least ₦${walletMinimum} to accept rides.`,
                        code: 'WALLET_BELOW_MINIMUM',
                    });
                }
                if ((driver.is_online ?? '').toString().toLowerCase() !== 'online') {
                    return res.status(403).json({ message: 'You must be online to accept rides.', code: 'DRIVER_OFFLINE' });
                }
            }
        }
        const ride = await Ride_1.default.findByIdAndUpdate(id, { driver_ref, status: 'accepted', accepted_at: new Date() }, { new: true });
        if (!ride)
            return res.status(404).json({ message: 'Ride not found' });
        try {
            const passengerSocketId = (0, socketManager_1.getUserSocket)(ride.passenger_ref.toString());
            if (passengerSocketId) {
                const io = (0, socketManager_1.getIO)();
                io.to(passengerSocketId).emit('ride_accepted', {
                    ride: { ...ride, _id: ride.id },
                    driver_ref
                });
                console.log(`[Socket] Emitted ride_accepted to passenger ${ride.passenger_ref}`);
            }
        }
        catch (socketErr) {
            console.warn('[Socket] Could not emit ride_accepted:', socketErr);
        }
        // FCM push notification to passenger
        try {
            if (ride.passenger_ref) {
                const passengerRow = await (0, db_1.query)(`SELECT fcm_token FROM users WHERE id::text = $1 OR uid = $1 LIMIT 1`, [ride.passenger_ref.toString()]);
                const fcmToken = passengerRow.rows[0]?.fcm_token;
                if (fcmToken) {
                    await (0, firebase_1.sendPushToTokens)([fcmToken], 'Driver Found!', 'Your driver has accepted the ride and is on the way.', { rideId: id, type: 'ride_accepted' });
                }
            }
        }
        catch (fcmErr) {
            console.warn('[FCM] acceptRide push error:', fcmErr);
        }
        res.json({ ride: { ...ride, _id: ride.id } });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.acceptRide = acceptRide;
const startRide = async (req, res) => {
    try {
        const id = req.params.id;
        const ride = await Ride_1.default.findByIdAndUpdate(id, { status: 'In_progress', started_at: new Date() }, { new: true });
        if (!ride)
            return res.status(404).json({ message: 'Ride not found' });
        const passengerSocketId = (0, socketManager_1.getUserSocket)(ride.passenger_ref.toString());
        if (passengerSocketId) {
            (0, socketManager_1.getIO)().to(passengerSocketId).emit('ride_started', { ride: { ...ride, _id: ride.id } });
        }
        // Either side can start the trip — notify the driver too so their screen
        // advances regardless of who tapped the button.
        if (ride.driver_ref) {
            const driverSocketId = (0, socketManager_1.getDriverSocket)(ride.driver_ref.toString());
            if (driverSocketId) {
                (0, socketManager_1.getIO)().to(driverSocketId).emit('ride_started', { ride: { ...ride, _id: ride.id } });
            }
        }
        res.json({ ride });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.startRide = startRide;
const completeRide = async (req, res) => {
    try {
        const id = req.params.id;
        const ride = await Ride_1.default.findByIdAndUpdate(id, { status: 'Completed', completed_at: new Date() }, { new: true });
        if (!ride)
            return res.status(404).json({ message: 'Ride not found' });
        // Deduct the platform commission from the driver's wallet. Non-fatal —
        // a wallet-side failure must never block the ride-completion response.
        try {
            if (ride.driver_ref && ride.final_fare && ride.final_fare > 0) {
                const driver = await resolveDriver(ride.driver_ref.toString());
                if (driver && driver.id) {
                    const settings = await FareSettings_1.default.getSettings();
                    const commission = Number((ride.final_fare * (settings.commission_percent / 100)).toFixed(2));
                    // Atomic increment (negative) — avoids a read-modify-write race if
                    // two rides for the same driver complete concurrently. Not floored
                    // at 0: a negative balance represents real driver debt and must
                    // stay in sync with the logged balance_after below.
                    const updatedDriver = await Driver_1.default.findByIdAndUpdate(driver.id, { $inc: { wallet_balance: -commission } }, { new: true });
                    const balanceAfter = updatedDriver?.wallet_balance ?? (driver.wallet_balance ?? 0) - commission;
                    await new WalletTransaction_1.default({
                        driver_ref: driver.id,
                        type: 'commission',
                        amount: -commission,
                        balance_after: balanceAfter,
                        note: `${settings.commission_percent}% commission on ride ${id}`,
                        ride_ref: id,
                    }).save();
                    // Commission just dropped them below the minimum — tell them now,
                    // rather than let them find out the silent way next time they try
                    // to accept a ride.
                    if (balanceAfter < settings.wallet_minimum_balance) {
                        try {
                            const tokenRow = await (0, db_1.query)(`SELECT fcm_token FROM drivers WHERE id = $1 LIMIT 1`, [driver.id]);
                            const fcmToken = tokenRow.rows[0]?.fcm_token;
                            if (fcmToken) {
                                await (0, firebase_1.sendPushToTokens)([fcmToken], 'Wallet balance low', `Your balance is now ₦${balanceAfter.toFixed(0)}. Fund your wallet to keep accepting rides.`, { type: 'wallet_low_balance' });
                            }
                        }
                        catch (pushErr) {
                            console.warn('[FCM] low-balance push error:', pushErr);
                        }
                    }
                }
            }
        }
        catch (walletErr) {
            console.warn('[Wallet] completeRide commission deduction error:', walletErr);
        }
        const passengerSocketId = (0, socketManager_1.getUserSocket)(ride.passenger_ref.toString());
        if (passengerSocketId) {
            (0, socketManager_1.getIO)().to(passengerSocketId).emit('ride_completed', { ride: { ...ride, _id: ride.id } });
        }
        // Either side (driver or passenger) can end the trip — notify the driver
        // too so their screen advances regardless of who completed it.
        if (ride.driver_ref) {
            const driverSocketId = (0, socketManager_1.getDriverSocket)(ride.driver_ref.toString());
            if (driverSocketId) {
                (0, socketManager_1.getIO)().to(driverSocketId).emit('ride_completed', { ride: { ...ride, _id: ride.id } });
            }
        }
        res.json({ ride });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.completeRide = completeRide;
const rateRide = async (req, res) => {
    try {
        const id = req.params.id;
        const { rating } = req.body;
        const ride = await Ride_1.default.findByIdAndUpdate(id, { rating }, { new: true });
        if (!ride)
            return res.status(404).json({ message: 'Ride not found' });
        res.json({ ride });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.rateRide = rateRide;
const cancelRide = async (req, res) => {
    try {
        const id = req.params.id;
        const ride = await Ride_1.default.findByIdAndUpdate(id, { status: 'Cancelled', cancelled_at: new Date() }, { new: true });
        if (!ride)
            return res.status(404).json({ message: 'Ride not found' });
        // Notify every connected driver so they can dismiss the incoming request card
        try {
            const io = (0, socketManager_1.getIO)();
            for (const [, socketId] of socketManager_1.driverSockets.entries()) {
                io.to(socketId).emit('ride_cancelled', { rideId: id });
            }
            // Also notify the assigned driver if one was already set
            if (ride.driver_ref) {
                const driverSocketId = socketManager_1.driverSockets.get(ride.driver_ref.toString());
                if (driverSocketId)
                    io.to(driverSocketId).emit('ride_cancelled', { rideId: id });
            }
        }
        catch (_) { }
        res.json(ride);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.cancelRide = cancelRide;
const getUserRideHistory = async (req, res) => {
    try {
        const userId = req.params.userId;
        const rides = await Ride_1.default.find({ passenger_ref: userId });
        res.json(rides);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getUserRideHistory = getUserRideHistory;
const getDriverRideHistory = async (req, res) => {
    try {
        const driverId = req.params.driverId;
        const rides = await Ride_1.default.find({ driver_ref: driverId });
        res.json(rides);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getDriverRideHistory = getDriverRideHistory;
