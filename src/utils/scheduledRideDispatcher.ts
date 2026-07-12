import { query } from '../db';
import Ride from '../models/Ride';
import { getIO, driverSockets } from '../sockets/socketManager';
import { sendPushToTokens } from '../firebase';

export const dispatchScheduledRides = async () => {
  try {
    // Atomically mark due rides as 'Dispatching' so concurrent runs never double-dispatch
    const due = await query(
      `UPDATE scheduled_rides
       SET status = 'Dispatching'
       WHERE LOWER(status) = 'pending'
         AND scheduled_time <= NOW() + INTERVAL '1 minute'
         AND scheduled_time >= NOW() - INTERVAL '60 minutes'
       RETURNING *`
    );

    if (!due.rowCount || due.rowCount === 0) return;

    console.log(`[Scheduler] Dispatching ${due.rowCount} scheduled ride(s)`);

    for (const sr of due.rows) {
      try {
        // Build a ride payload matching what requestRide creates
        const ridePayload: any = {
          passenger_ref: sr.passenger_ref || null,
          pickup_address: sr.pickup_address || '',
          dropoff_address: sr.dropoff_address || '',
          final_fare: Number(sr.estimated_fare) || 0,
          status: 'searching',
          ride_type: 'scheduled',
          requested_at: new Date(),
        };

        // Include coordinates if stored
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

        const ride = new Ride(ridePayload);
        const savedRide = await ride.save();
        const savedRideId = savedRide.id;
        if (!savedRideId) {
          throw new Error('Scheduled ride dispatch created a ride without an id');
        }
        const rideData = { ...savedRide, _id: savedRideId };

        // Save the created ride reference on the scheduled_rides row
        await query(
          `UPDATE scheduled_rides SET status = 'Dispatched', ride_ref = $1 WHERE id = $2`,
          [savedRideId, sr.id]
        );

        // Broadcast new_ride_offer to all available connected drivers
        try {
          const io = getIO();
          const activeStatuses = ['accepted', 'in_progress', 'In_progress', 'arrived'];
          let sent = 0;
          for (const [driverId, socketId] of driverSockets.entries()) {
            const busy = await Ride.findOne({ driver_ref: driverId, status: { $in: activeStatuses } });
            if (busy) continue;
            io.to(socketId).emit('new_ride_offer', { ride: rideData });
            sent++;
          }
          console.log(`[Scheduler] Sent new_ride_offer to ${sent} driver(s) for scheduled ride ${sr.id}`);
        } catch (socketErr) {
          console.warn('[Scheduler] Socket emit error:', socketErr);
        }

        // FCM push to all online drivers
        try {
          const tokenRows = await query(
            `SELECT fcm_token FROM drivers WHERE is_online = 'Online' AND fcm_token IS NOT NULL AND fcm_token != ''`
          );
          const tokens = tokenRows.rows.map((r: any) => r.fcm_token as string).filter(Boolean);
          if (tokens.length > 0) {
            await sendPushToTokens(
              tokens,
              'Scheduled Ride Ready',
              `Pickup: ${sr.pickup_address || 'Nearby location'}`,
              { rideId: savedRideId }
            );
          }
        } catch (fcmErr) {
          console.warn('[Scheduler] FCM push error:', fcmErr);
        }

        console.log(`[Scheduler] Scheduled ride ${sr.id} -> live ride ${savedRideId}`);
      } catch (err: any) {
        console.error(`[Scheduler] Error dispatching scheduled ride ${sr.id}:`, err.message);
        // Revert so it can be retried on next tick
        await query(`UPDATE scheduled_rides SET status = 'Pending' WHERE id = $1`, [sr.id]);
      }
    }
  } catch (err: any) {
    console.error('[Scheduler] dispatchScheduledRides error:', err.message);
  }
};
