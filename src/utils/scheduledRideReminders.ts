import { query } from '../db';
import { sendPushToTokens } from '../firebase';

export const sendScheduledRideReminders = async () => {
  try {
    // 1. Remind 20 minutes before
    const due20m = await query(
      `SELECT sr.id, sr.scheduled_time, d.fcm_token
       FROM scheduled_rides sr
       JOIN drivers d ON sr.driver_ref = d.uid OR sr.driver_ref = d.id::text
       WHERE LOWER(sr.status) = 'accepted'
         AND sr.reminded_20m = FALSE
         AND sr.scheduled_time <= NOW() + INTERVAL '20 minutes'
         AND sr.scheduled_time > NOW() + INTERVAL '5 minutes'`
    );

    for (const sr of due20m.rows) {
      try {
        if (sr.fcm_token) {
          await sendPushToTokens(
            [sr.fcm_token],
            'Upcoming Scheduled Ride Reminder',
            'You have an accepted scheduled ride starting in 20 minutes.',
            { rideId: sr.id, type: 'scheduled_ride_reminder', minutes: '20' }
          );
        }
      } catch (err) {
        console.warn(`[Reminders] Failed to send 20m push for ride ${sr.id}:`, err);
      }
      await query(`UPDATE scheduled_rides SET reminded_20m = TRUE WHERE id = $1`, [sr.id]);
    }

    // 2. Remind 10 minutes before
    const due10m = await query(
      `SELECT sr.id, sr.scheduled_time, d.fcm_token
       FROM scheduled_rides sr
       JOIN drivers d ON sr.driver_ref = d.uid OR sr.driver_ref = d.id::text
       WHERE LOWER(sr.status) = 'accepted'
         AND sr.reminded_10m = FALSE
         AND sr.scheduled_time <= NOW() + INTERVAL '10 minutes'
         AND sr.scheduled_time > NOW() + INTERVAL '2 minutes'`
    );

    for (const sr of due10m.rows) {
      try {
        if (sr.fcm_token) {
          await sendPushToTokens(
            [sr.fcm_token],
            'Upcoming Scheduled Ride Reminder',
            'You have an accepted scheduled ride starting in 10 minutes.',
            { rideId: sr.id, type: 'scheduled_ride_reminder', minutes: '10' }
          );
        }
      } catch (err) {
        console.warn(`[Reminders] Failed to send 10m push for ride ${sr.id}:`, err);
      }
      await query(`UPDATE scheduled_rides SET reminded_10m = TRUE WHERE id = $1`, [sr.id]);
    }

    // 3. Remind 5 minutes before
    const due5m = await query(
      `SELECT sr.id, sr.scheduled_time, d.fcm_token
       FROM scheduled_rides sr
       JOIN drivers d ON sr.driver_ref = d.uid OR sr.driver_ref = d.id::text
       WHERE LOWER(sr.status) = 'accepted'
         AND sr.reminded_5m = FALSE
         AND sr.scheduled_time <= NOW() + INTERVAL '5 minutes'
         AND sr.scheduled_time >= NOW() - INTERVAL '2 minutes'`
    );

    for (const sr of due5m.rows) {
      try {
        if (sr.fcm_token) {
          await sendPushToTokens(
            [sr.fcm_token],
            'Upcoming Scheduled Ride Reminder',
            'You have an accepted scheduled ride starting in 5 minutes.',
            { rideId: sr.id, type: 'scheduled_ride_reminder', minutes: '5' }
          );
        }
      } catch (err) {
        console.warn(`[Reminders] Failed to send 5m push for ride ${sr.id}:`, err);
      }
      await query(`UPDATE scheduled_rides SET reminded_5m = TRUE WHERE id = $1`, [sr.id]);
    }
  } catch (err: any) {
    console.error('[Reminders] sendScheduledRideReminders error:', err.message);
  }
};
