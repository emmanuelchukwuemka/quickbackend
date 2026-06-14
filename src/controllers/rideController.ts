import { Request, Response } from 'express';
import Ride from '../models/Ride';
import { getIO, driverSockets, getUserSocket } from '../sockets/socketManager';

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

    const saveRideAndBroadcast = async (payload: any) => {
      const ride = new Ride(payload);
      ride.status = 'searching';
      const savedRide = await ride.save();
      const rideData = { ...savedRide, _id: savedRide.id };
      try {
        const io = getIO();
        for (const [, socketId] of driverSockets.entries()) {
          io.to(socketId).emit('new_ride_offer', { ride: rideData });
        }
        console.log(`[Socket] Broadcasted new_ride_offer to ${driverSockets.size} driver(s)`);
      } catch (socketErr) {
        console.warn('[Socket] Could not emit new_ride_offer:', socketErr);
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
