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

const cancelSearchingRidesForPassenger = async (passengerId: string, io: Server) => {
  const searchingRides = await Ride.find({
    passenger_ref: passengerId,
    status: { $in: ['searching', 'requested', 'Pending'] },
  });

  for (const ride of searchingRides) {
    const cancelled = await Ride.findByIdAndUpdate(
      ride.id!,
      { status: 'Cancelled', cancelled_at: new Date() },
      { new: true }
    );
    if (!cancelled) continue;

    for (const [, socketId] of driverSockets.entries()) {
      io.to(socketId).emit('ride_cancelled', { rideId: cancelled.id });
    }
  }
};

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
    socket.on('chat_message', async (data: {
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

        // Send FCM push notification so it pops up as alert
        try {
          const { query } = await import('../db');
          const { sendPushToTokens } = await import('../firebase');
          
          let fcmToken = '';
          if (data.toRole === 'driver') {
            const row = await query(
              "SELECT fcm_token FROM drivers WHERE uid = $1 OR id::text = $2 LIMIT 1",
              [data.toId, data.toId]
            );
            fcmToken = row.rows[0]?.fcm_token;
          } else {
            const row = await query(
              "SELECT fcm_token FROM users WHERE uid = $1 OR id::text = $2 LIMIT 1",
              [data.toId, data.toId]
            );
            fcmToken = row.rows[0]?.fcm_token;
          }

          if (fcmToken) {
            await sendPushToTokens(
              [fcmToken],
              data.senderName,
              data.message,
              {
                rideId: data.rideId,
                type: 'chat_message',
                message: data.message,
                senderName: data.senderName,
              }
            );
          }
        } catch (fcmErr) {
          console.warn('[Socket] FCM push chat relay error:', fcmErr);
        }
      } catch (err) {
        console.error('[Socket] chat_message error:', err);
      }
    });

    // In-app voice call signaling — this server only relays WebRTC
    // offer/answer/ICE messages between the two parties, it never inspects
    // or stores call content.
    const getTargetSocket = (toId: string, toRole: 'driver' | 'passenger') =>
      toRole === 'driver' ? driverSockets.get(toId) : userSockets.get(toId);

    socket.on('call_offer', async (data: {
      rideId: string;
      callId: string;
      toId: string;
      toRole: 'driver' | 'passenger';
      fromId: string;
      fromRole: 'driver' | 'passenger';
      fromName: string;
      sdp: any;
    }) => {
      try {
        const targetSocketId = getTargetSocket(data.toId, data.toRole);
        if (!targetSocketId) {
          socket.emit('call_unavailable', { callId: data.callId, toId: data.toId });
          return;
        }
        io.to(targetSocketId).emit('call_offer', data);
        console.log(`[Socket] call_offer relayed to ${data.toRole} ${data.toId}`);

        // Wake the callee's app with a push if it's backgrounded
        try {
          const { query } = await import('../db');
          const { sendPushToTokens } = await import('../firebase');
          const table = data.toRole === 'driver' ? 'drivers' : 'users';
          const row = await query(
            `SELECT fcm_token FROM ${table} WHERE uid = $1 OR id::text = $2 LIMIT 1`,
            [data.toId, data.toId]
          );
          const fcmToken = row.rows[0]?.fcm_token;
          if (fcmToken) {
            await sendPushToTokens(
              [fcmToken],
              `Incoming call from ${data.fromName}`,
              'Tap to answer',
              { rideId: data.rideId, callId: data.callId, type: 'incoming_call' }
            );
          }
        } catch (fcmErr) {
          console.warn('[Socket] FCM push call_offer error:', fcmErr);
        }
      } catch (err) {
        console.error('[Socket] call_offer error:', err);
      }
    });

    socket.on('call_answer', (data: {
      callId: string; toId: string; toRole: 'driver' | 'passenger'; sdp: any;
    }) => {
      const targetSocketId = getTargetSocket(data.toId, data.toRole);
      if (targetSocketId) io.to(targetSocketId).emit('call_answer', data);
    });

    socket.on('call_ice_candidate', (data: {
      callId: string; toId: string; toRole: 'driver' | 'passenger'; candidate: any;
    }) => {
      const targetSocketId = getTargetSocket(data.toId, data.toRole);
      if (targetSocketId) io.to(targetSocketId).emit('call_ice_candidate', data);
    });

    socket.on('call_reject', (data: {
      callId: string; toId: string; toRole: 'driver' | 'passenger'; reason?: string;
    }) => {
      const targetSocketId = getTargetSocket(data.toId, data.toRole);
      if (targetSocketId) io.to(targetSocketId).emit('call_reject', data);
    });

    socket.on('call_end', (data: {
      callId: string; toId: string; toRole: 'driver' | 'passenger';
    }) => {
      const targetSocketId = getTargetSocket(data.toId, data.toRole);
      if (targetSocketId) io.to(targetSocketId).emit('call_end', data);
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`);
      // Remove from maps if exists
      const disconnectedPassengerIds: string[] = [];
      for (const [key, value] of userSockets.entries()) {
        if (value === socket.id) {
          userSockets.delete(key);
          disconnectedPassengerIds.push(key);
        }
      }
      for (const [key, value] of driverSockets.entries()) {
        if (value === socket.id) driverSockets.delete(key);
      }
      for (const passengerId of disconnectedPassengerIds) {
        cancelSearchingRidesForPassenger(passengerId, io).catch((err) => {
          console.error('[Socket] Failed to cancel searching rides for disconnected passenger:', err);
        });
      }
    });
  });
};
