import { Request, Response } from 'express';
import Ride from '../models/Ride';
import { query } from '../db';
import { getIO, driverSockets, getUserSocket } from '../sockets/socketManager';
import { sendPushToTokens } from '../firebase';

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
       LEFT JOIN users   u ON r.passenger_ref = u.uid
       LEFT JOIN drivers d ON r.driver_ref    = d.uid
       WHERE r.id = $1 LIMIT 1`,
      [id]
    );
    if (!result.rowCount) return res.status(404).json({ message: 'Ride not found' });
    const row = result.rows[0];
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
      requested_at: row.requested_at,
      accepted_at: row.accepted_at,
    };
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

    const saveRideAndBroadcast = async (payload: any) => {
      const ride = new Ride(payload);
      ride.status = 'searching';
      const savedRide = await ride.save();
      const rideData = { ...savedRide, _id: savedRide.id };
      try {
        const io = getIO();
        const activeStatuses = ['accepted', 'in_progress', 'In_progress', 'arrived'];
        let sent = 0;
        for (const [driverId, socketId] of driverSockets.entries()) {
          // Skip drivers already on an active ride
          const busy = await Ride.findOne({ driver_ref: driverId, status: { $in: activeStatuses } });
          if (busy) continue;
          io.to(socketId).emit('new_ride_offer', { ride: rideData });
          sent++;
        }
        console.log(`[Socket] Broadcasted new_ride_offer to ${sent}/${driverSockets.size} available driver(s)`);
      } catch (socketErr) {
        console.warn('[Socket] Could not emit new_ride_offer:', socketErr);
      }

      // FCM: push to online drivers who have a token stored
      try {
        const tokenRows = await query(
          `SELECT fcm_token FROM drivers WHERE is_online = 'Online' AND fcm_token IS NOT NULL AND fcm_token != ''`
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

    const passengerSocketId = getUserSocket(ride.passenger_ref!.toString());
    if (passengerSocketId) {
      getIO().to(passengerSocketId).emit('ride_completed', { ride: { ...ride, _id: ride.id } });
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
