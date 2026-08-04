import { Request, Response } from 'express';
import Ride from '../models/Ride';
import Driver from '../models/Driver';
import FareSettings from '../models/FareSettings';
import WalletTransaction from '../models/WalletTransaction';
import { query } from '../db';
import { getIO, driverSockets, getUserSocket, getDriverSocket } from '../sockets/socketManager';
import { sendPushToTokens } from '../firebase';
import { calculateRideFare } from '../utils/fare';
import { calculateDistanceAndETA } from '../utils/mapsService';
import { sanitizeDisplayName } from '../utils/displayName';

const resolveDriver = (driverRef: string) =>
  Driver.findOne({ $or: [{ id: driverRef }, { uid: driverRef }] });

const toEstimatedMinutes = (value: unknown) => {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? Math.ceil(num) : null;
};

const buildRideResponse = (ride: Ride) => {
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

export const getRideById = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    // Join with users to get passenger display_name and phone
    const result = await query(
      `SELECT r.*,
              u.display_name AS passenger_name, u.phone_number AS passenger_phone,
              d.display_name AS driver_name,    d.phone_number AS driver_phone,
              d.driver_rating AS driver_rating
       FROM rides r
       LEFT JOIN users   u ON (r.passenger_ref = u.id::text OR r.passenger_ref = u.uid)
       LEFT JOIN drivers d ON (r.driver_ref    = d.id::text OR r.driver_ref    = d.uid)
       WHERE r.id = $1 LIMIT 1`,
      [id]
    );
    if (!result.rowCount) return res.status(404).json({ message: 'Ride not found' });
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
    ride.passenger_name = sanitizeDisplayName(ride.passenger_name);
    ride.driver_name = sanitizeDisplayName(ride.driver_name);
    return res.json({ ride });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const arriveRide = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const ride = await Ride.findByIdAndUpdate(id, { status: 'arrived' }, { new: true });
    if (!ride) return res.status(404).json({ message: 'Ride not found' });
    try {
      const passengerSocketId = getUserSocket(ride.passenger_ref!.toString());
      if (passengerSocketId) {
        getIO().to(passengerSocketId).emit('driver_arrived', { rideId: id });
      }
    } catch (_) {}

    // FCM push notification to passenger
    try {
      if (ride.passenger_ref) {
        const passengerRow = await query(
          `SELECT fcm_token FROM users WHERE id::text = $1 OR uid = $1 LIMIT 1`,
          [ride.passenger_ref.toString()]
        );
        const fcmToken = passengerRow.rows[0]?.fcm_token;
        if (fcmToken) {
          await sendPushToTokens(
            [fcmToken],
            'Driver Arrived!',
            'Your driver has arrived at your location.',
            { rideId: id, type: 'driver_arrived' }
          );
        }
      }
    } catch (fcmErr) {
      console.warn('[FCM] arriveRide push error:', fcmErr);
    }

    res.json({ ride: { ...ride, _id: ride.id } });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const requestRide = async (req: Request, res: Response) => {
  try {
    const ridePayload = { ...req.body } as any;
    if (req.body.passenger_id && !req.body.passenger_ref) {
      ridePayload.passenger_ref = req.body.passenger_id;
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
      const routeMetrics = calculateDistanceAndETA(
        { lat: Number(req.body.pickupLat), lng: Number(req.body.pickupLng) },
        { lat: Number(req.body.dropoffLat), lng: Number(req.body.dropoffLng) }
      );
      if (!ridePayload.distanceKm || ridePayload.distanceKm <= 0) {
        ridePayload.distanceKm = routeMetrics.distanceKm;
      }
      ridePayload.time = String(routeMetrics.estimatedMinutes);
    }

    ridePayload.final_fare = await calculateRideFare(ridePayload.distanceKm, ridePayload.ride_type);

    const saveRideAndBroadcast = async (payload: any) => {
      const ride = new Ride(payload);
      ride.status = 'searching';
      const savedRide = await ride.save();
      const rideData = buildRideResponse(savedRide);
      const walletMinimum = (await FareSettings.getSettings()).wallet_minimum_balance;

      try {
        const io = getIO();
        const activeStatuses = ['accepted', 'in_progress', 'In_progress', 'arrived'];
        let sent = 0;
        for (const [driverId, socketId] of driverSockets.entries()) {
          // Skip drivers already on an active ride
          const busy = await Ride.findOne({ driver_ref: driverId, status: { $in: activeStatuses } });
          if (busy) continue;
          const driverRow = await query(
            `SELECT is_online, wallet_balance FROM drivers WHERE id::text = $1 OR uid = $1 LIMIT 1`,
            [driverId]
          );
          const isOnline = (driverRow.rows[0]?.is_online ?? '').toString().toLowerCase() === 'online';
          if (!isOnline) continue;
          const walletBalance = Number(driverRow.rows[0]?.wallet_balance ?? 0);
          if (walletBalance < walletMinimum) continue;
          io.to(socketId).emit('new_ride_offer', { ride: rideData });
          sent++;
        }
        console.log(`[Socket] Broadcasted new_ride_offer to ${sent}/${driverSockets.size} available driver(s)`);
      } catch (socketErr) {
        console.warn('[Socket] Could not emit new_ride_offer:', socketErr);
      }

      // FCM: push to online drivers who have a token stored and meet the wallet minimum
      try {
        const tokenRows = await query(
          `SELECT fcm_token FROM drivers WHERE is_online = 'Online' AND wallet_balance >= $1 AND fcm_token IS NOT NULL AND fcm_token != ''`,
          [walletMinimum]
        );
        const tokens = tokenRows.rows.map((r: any) => r.fcm_token as string).filter(Boolean);
        const pickup = rideData.pickup_address || 'Nearby location';
        await sendPushToTokens(
          tokens,
          'New Ride Request',
          `Pickup: ${pickup}`,
          { rideId: String(rideData.id ?? rideData._id ?? '') }
        );
      } catch (fcmErr) {
        console.warn('[FCM] push error:', fcmErr);
      }

      return rideData;
    };

    try {
      const rideData = await saveRideAndBroadcast(ridePayload);
      return res.status(201).json({ ride: rideData });
    } catch (saveError: any) {
      // FK constraint: passenger_ref not in users table (e.g. DB reset in dev)
      if (saveError.code === '23503' && ridePayload.passenger_ref) {
        console.warn(`[Ride] passenger_ref ${ridePayload.passenger_ref} not found — saving ride without it`);
        ridePayload.passenger_ref = null;
        const rideData = await saveRideAndBroadcast(ridePayload);
        return res.status(201).json({ ride: rideData });
      }
      throw saveError;
    }
  } catch (error: any) {
    console.error('[Ride] requestRide error:', error.message);
    res.status(500).json({ message: error.message });
  }
};

export const acceptRide = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const driver_ref = req.body.driver_ref || req.body.driver_id;

    if (driver_ref) {
      const driver = await resolveDriver(driver_ref.toString());
      if (driver) {
        const walletMinimum = (await FareSettings.getSettings()).wallet_minimum_balance;
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

    const ride = await Ride.findByIdAndUpdate(id, { driver_ref, status: 'accepted', accepted_at: new Date() }, { new: true });
    if (!ride) return res.status(404).json({ message: 'Ride not found' });

    try {
      const passengerSocketId = getUserSocket(ride.passenger_ref!.toString());
      if (passengerSocketId) {
        const io = getIO();
        io.to(passengerSocketId).emit('ride_accepted', {
          ride: { ...ride, _id: ride.id },
          driver_ref
        });
        console.log(`[Socket] Emitted ride_accepted to passenger ${ride.passenger_ref}`);
      }
    } catch (socketErr) {
      console.warn('[Socket] Could not emit ride_accepted:', socketErr);
    }

    // FCM push notification to passenger
    try {
      if (ride.passenger_ref) {
        const passengerRow = await query(
          `SELECT fcm_token FROM users WHERE id::text = $1 OR uid = $1 LIMIT 1`,
          [ride.passenger_ref.toString()]
        );
        const fcmToken = passengerRow.rows[0]?.fcm_token;
        if (fcmToken) {
          await sendPushToTokens(
            [fcmToken],
            'Driver Found!',
            'Your driver has accepted the ride and is on the way.',
            { rideId: id, type: 'ride_accepted' }
          );
        }
      }
    } catch (fcmErr) {
      console.warn('[FCM] acceptRide push error:', fcmErr);
    }

    res.json({ ride: { ...ride, _id: ride.id } });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const startRide = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const ride = await Ride.findByIdAndUpdate(id, { status: 'In_progress', started_at: new Date() }, { new: true });
    if (!ride) return res.status(404).json({ message: 'Ride not found' });

    const passengerSocketId = getUserSocket(ride.passenger_ref!.toString());
    if (passengerSocketId) {
      getIO().to(passengerSocketId).emit('ride_started', { ride: { ...ride, _id: ride.id } });
    }
    // Either side can start the trip — notify the driver too so their screen
    // advances regardless of who tapped the button.
    if (ride.driver_ref) {
      const driverSocketId = getDriverSocket(ride.driver_ref.toString());
      if (driverSocketId) {
        getIO().to(driverSocketId).emit('ride_started', { ride: { ...ride, _id: ride.id } });
      }
    }

    res.json({ ride });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const completeRide = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const ride = await Ride.findByIdAndUpdate(id, { status: 'Completed', completed_at: new Date() }, { new: true });
    if (!ride) return res.status(404).json({ message: 'Ride not found' });

    // Deduct the platform commission from the driver's wallet. Non-fatal —
    // a wallet-side failure must never block the ride-completion response.
    try {
      if (ride.driver_ref && ride.final_fare && ride.final_fare > 0) {
        const driver = await resolveDriver(ride.driver_ref.toString());
        if (driver && driver.id) {
          const settings = await FareSettings.getSettings();
          const commission = Number((ride.final_fare * (settings.commission_percent / 100)).toFixed(2));
          // Atomic increment (negative) — avoids a read-modify-write race if
          // two rides for the same driver complete concurrently. Not floored
          // at 0: a negative balance represents real driver debt and must
          // stay in sync with the logged balance_after below.
          const updatedDriver = await Driver.findByIdAndUpdate(driver.id, { $inc: { wallet_balance: -commission } }, { new: true });
          const balanceAfter = updatedDriver?.wallet_balance ?? (driver.wallet_balance ?? 0) - commission;
          await new WalletTransaction({
            driver_ref: driver.id,
            type: 'commission',
            amount: -commission,
            balance_after: balanceAfter,
            note: `${settings.commission_percent}% commission on ride ${id}`,
            ride_ref: id,
          }).save();
        }
      }
    } catch (walletErr) {
      console.warn('[Wallet] completeRide commission deduction error:', walletErr);
    }

    const passengerSocketId = getUserSocket(ride.passenger_ref!.toString());
    if (passengerSocketId) {
      getIO().to(passengerSocketId).emit('ride_completed', { ride: { ...ride, _id: ride.id } });
    }
    // Either side (driver or passenger) can end the trip — notify the driver
    // too so their screen advances regardless of who completed it.
    if (ride.driver_ref) {
      const driverSocketId = getDriverSocket(ride.driver_ref.toString());
      if (driverSocketId) {
        getIO().to(driverSocketId).emit('ride_completed', { ride: { ...ride, _id: ride.id } });
      }
    }

    res.json({ ride });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const rateRide = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { rating } = req.body;
    const ride = await Ride.findByIdAndUpdate(id, { rating }, { new: true });
    if (!ride) return res.status(404).json({ message: 'Ride not found' });
    res.json({ ride });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const cancelRide = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const ride = await Ride.findByIdAndUpdate(id, { status: 'Cancelled', cancelled_at: new Date() }, { new: true });
    if (!ride) return res.status(404).json({ message: 'Ride not found' });

    // Notify every connected driver so they can dismiss the incoming request card
    try {
      const io = getIO();
      for (const [, socketId] of driverSockets.entries()) {
        io.to(socketId).emit('ride_cancelled', { rideId: id });
      }
      // Also notify the assigned driver if one was already set
      if (ride.driver_ref) {
        const driverSocketId = driverSockets.get(ride.driver_ref.toString());
        if (driverSocketId) io.to(driverSocketId).emit('ride_cancelled', { rideId: id });
      }
    } catch (_) {}

    res.json(ride);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getUserRideHistory = async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId as string;
    const rides = await Ride.find({ passenger_ref: userId });
    res.json(rides);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getDriverRideHistory = async (req: Request, res: Response) => {
  try {
    const driverId = req.params.driverId as string;
    const rides = await Ride.find({ driver_ref: driverId });
    res.json(rides);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
