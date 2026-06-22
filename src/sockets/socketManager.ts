import { Server, Socket } from 'socket.io';
import Driver from '../models/Driver';
import User from '../models/User';
import Ride from '../models/Ride';

let ioInstance: Server;

export const userSockets = new Map<string, string>();
export const driverSockets = new Map<string, string>();

export const getIO = () => {
  if (!ioInstance) {
    if (process.env.NODE_ENV === 'test') {
      return { to: () => ({ emit: () => {} }), emit: () => {} } as any;
    }
    throw new Error('Socket.io not initialized!');
  }
  return ioInstance;
};

export const getUserSocket = (userId: string) => userSockets.get(userId);
export const getDriverSocket = (driverId: string) => driverSockets.get(driverId);

export const initSockets = (io: Server) => {
  ioInstance = io;

  io.on('connection', (socket: Socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    // Registration event to map DB IDs to Socket IDs
    socket.on('register', (data: { id: string; role: 'driver' | 'passenger' }) => {
      if (data.role === 'driver') {
        driverSockets.set(data.id, socket.id);
        console.log(`[Socket] Driver registered: ${data.id} -> ${socket.id}`);
      } else {
        userSockets.set(data.id, socket.id);
        console.log(`[Socket] Passenger registered: ${data.id} -> ${socket.id}`);
      }
    });

    // Driver updates location
    socket.on('updateLocation', async (data: { driverId: string; lat: number; lng: number }) => {
      try {
        const { driverId, lat, lng } = data;
        
        await Driver.findByIdAndUpdate(driverId, {
          location: {
            type: 'Point',
            coordinates: [lng, lat]
          }
        });

        // Find if this driver is currently on an active ride
        const activeRide = await Ride.findOne({
          driver_ref: driverId,
          status: { $in: ['accepted', 'In_progress', 'in_progress'] }
        });

        if (activeRide) {
          const passengerSocketId = getUserSocket(activeRide.passenger_ref!.toString());
          if (passengerSocketId) {
            // Forward driver's live location to the passenger
            io.to(passengerSocketId).emit('driverLocationUpdated', { driverId, lat, lng });
          }
        }
      } catch (err) {
        console.error('[Socket] Error updating driver location:', err);
      }
    });

    // User updates location
    socket.on('updateUserLocation', async (data: { userId: string; lat: number; lng: number }) => {
      try {
        const { userId, lat, lng } = data;
        await User.findByIdAndUpdate(userId, {
          location: {
            type: 'Point',
            coordinates: [lng, lat]
          }
        });
      } catch (err) {
        console.error('[Socket] Error updating user location:', err);
      }
    });

    // In-app chat relay — forward message to the other party in the ride
    socket.on('chat_message', (data: {
      rideId: string;
      toId: string;
      toRole: 'driver' | 'passenger';
      message: string;
      senderName: string;
      senderId: string;
      timestamp: number;
    }) => {
      try {
        const targetSocketId = data.toRole === 'driver'
          ? driverSockets.get(data.toId)
          : userSockets.get(data.toId);
        if (targetSocketId) {
          io.to(targetSocketId).emit('chat_message', data);
          console.log(`[Socket] Chat relayed to ${data.toRole} ${data.toId}`);
        }
      } catch (err) {
        console.error('[Socket] chat_message error:', err);
      }
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`);
      // Remove from maps if exists
      for (const [key, value] of userSockets.entries()) {
        if (value === socket.id) userSockets.delete(key);
      }
      for (const [key, value] of driverSockets.entries()) {
        if (value === socket.id) driverSockets.delete(key);
      }
    });
  });
};
