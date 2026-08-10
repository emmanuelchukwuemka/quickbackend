import { Server, Socket } from 'socket.io';
import Driver from '../models/Driver';
import User from '../models/User';
import Ride from '../models/Ride';

let ioInstance: Server;

export const userSockets = new Map<string, string>();
export const driverSockets = new Map<string, string>();

// Call offers for a target that isn't currently connected (locked/backgrounded
// phone — its socket has dropped) are held here so they can be redelivered the
// moment that device reconnects, rather than lost the instant the initial
// relay attempt finds no live socket.
type PendingCallOffer = { data: any; expiresAt: number };
const pendingCallOffers = new Map<string, PendingCallOffer>();
const pendingCallOfferKey = (toRole: 'driver' | 'passenger', toId: string) => `${toRole}:${toId}`;
const CALL_RING_TIMEOUT_MS = 5 * 60 * 1000;
// How long to wait after a passenger's socket drops before treating it as a
// real departure rather than a transient network blip.
const DISCONNECT_GRACE_MS = 20 * 1000;

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
    socket.on('updateLocation', async (data: { driverId: string; lat: number; lng: number }) => {
      try {
        const { driverId, lat, lng } = data;

        // The app sends the driver's string uid here, not their numeric id —
        // findByIdAndUpdate only matches on id, so this was silently failing
        // to persist every single location update (the real-time relay to
        // the passenger below still worked, but the stored location never
        // actually changed, leaving the poll-fallback permanently stale).
        const driver = await Driver.findOne({ $or: [{ id: driverId }, { uid: driverId }] });
        if (driver?.id) {
          await Driver.findByIdAndUpdate(driver.id, {
            location: {
              type: 'Point',
              coordinates: [lng, lat]
            }
          });
        }

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
        // Same id/uid mismatch as updateLocation above.
        const user = await User.findOne({ $or: [{ id: userId }, { uid: userId }] });
        if (user?.id) {
          await User.findByIdAndUpdate(user.id, {
            location: {
              type: 'Point',
              coordinates: [lng, lat]
            }
          });
        }
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
                // So a killed/locked recipient's app can open straight to
                // this thread without guessing who the other party is.
                fromId: data.senderId,
                fromRole: data.toRole === 'driver' ? 'passenger' : 'driver',
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

        const sendWakePush = async (): Promise<boolean> => {
          try {
            const { query } = await import('../db');
            const { sendPushToTokens } = await import('../firebase');
            const table = data.toRole === 'driver' ? 'drivers' : 'users';
            const row = await query(
              `SELECT fcm_token FROM ${table} WHERE uid = $1 OR id::text = $2 LIMIT 1`,
              [data.toId, data.toId]
            );
            const fcmToken = row.rows[0]?.fcm_token;
            if (!fcmToken) return false;
            await sendPushToTokens(
              [fcmToken],
              `Incoming call from ${data.fromName}`,
              'Tap to answer',
              {
                rideId: data.rideId,
                callId: data.callId,
                type: 'incoming_call',
                // So the callee's device can show a full-screen ringing UI
                // and — if declined right from that screen — tell the
                // caller without ever opening the app.
                fromId: data.fromId,
                fromRole: data.fromRole,
                fromName: data.fromName,
              }
            );
            return true;
          } catch (fcmErr) {
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
        // Mobile connections drop and reconnect constantly (a signal blip, a
        // WiFi/cellular handoff, the OS briefly suspending the socket) —
        // Socket.IO clients recover from these in a second or two on their
        // own. Cancelling the instant the transport drops treated a normal
        // reconnect as "the passenger left" and cancelled their search out
        // from under them. Wait, then only cancel if they're still gone.
        setTimeout(() => {
          if (userSockets.has(passengerId)) return; // reconnected — nothing to do
          cancelSearchingRidesForPassenger(passengerId, io).catch((err) => {
            console.error('[Socket] Failed to cancel searching rides for disconnected passenger:', err);
          });
        }, DISCONNECT_GRACE_MS);
      }
    });
  });
};
