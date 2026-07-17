import { Router, Request, Response } from 'express';
import { query } from '../db';
import { v4 as uuid } from 'uuid';
import { calculateDistanceKm, calculateRideFare } from '../utils/fare';
import { sanitizeDisplayName } from '../utils/displayName';

const router = Router();

// GET /api/scheduled-rides?status=Pending&passenger_ref=xxx
router.get('/', async (req: Request, res: Response) => {
  try {
    const { passenger_ref, status } = req.query;
    let sql = `
      SELECT sr.*, u.display_name AS passenger_name, u.phone_number AS passenger_phone
      FROM scheduled_rides sr
      LEFT JOIN users u ON (sr.passenger_ref = u.id::text OR sr.passenger_ref = u.uid)
      WHERE 1=1
    `;
    const params: any[] = [];
    if (passenger_ref) {
      params.push(passenger_ref);
      sql += ` AND sr.passenger_ref = $${params.length}`;
    }
    if (status) {
      params.push((status as string).toLowerCase());
      sql += ` AND LOWER(sr.status) = $${params.length}`;
    }
    // Filter out pending scheduled rides that have already passed
    if (status && (status as string).toLowerCase() === 'pending') {
      sql += ` AND sr.scheduled_time >= NOW()`;
    }
    sql += ' ORDER BY sr.scheduled_time ASC';
    const result = await query(sql, params);
    res.json(
      result.rows.map((row) => ({
        ...row,
        passenger_name: sanitizeDisplayName(row.passenger_name),
      }))
    );
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// POST /api/scheduled-rides
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      passenger_ref,
      pickup_address,
      dropoff_address,
      pickup_lat,
      pickup_lng,
      dropoff_lat,
      dropoff_lng,
      estimated_fare,
      scheduled_time,
    } = req.body;

    if (!scheduled_time) {
      return res.status(400).json({ message: 'scheduled_time is required' });
    }

    // Validate that the scheduled time is not in the past (allow 1 minute grace period for latency)
    const schedDate = new Date(scheduled_time);
    if (schedDate.getTime() < Date.now() - 60000) {
      return res.status(400).json({ message: 'Cannot schedule a ride in the past.' });
    }

    const safePickupLat = Number(pickup_lat) || 0;
    const safePickupLng = Number(pickup_lng) || 0;
    const safeDropoffLat = Number(dropoff_lat) || 0;
    const safeDropoffLng = Number(dropoff_lng) || 0;
    const distanceKm = calculateDistanceKm(
      safePickupLat,
      safePickupLng,
      safeDropoffLat,
      safeDropoffLng,
    );
    const hasCoordinates = distanceKm > 0;
    const normalizedFare = hasCoordinates
      ? calculateRideFare(distanceKm)
      : Number(estimated_fare) || 0;

    const id = uuid();
    const result = await query(
      `INSERT INTO scheduled_rides
        (id, passenger_ref, pickup_address, dropoff_address, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, estimated_fare, scheduled_time, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'Pending', NOW())
       RETURNING *`,
      [
        id,
        passenger_ref || null,
        pickup_address || '',
        dropoff_address || '',
        safePickupLat,
        safePickupLng,
        safeDropoffLat,
        safeDropoffLng,
        normalizedFare,
        scheduled_time,
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// PATCH /api/scheduled-rides/:id/status
router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const { status, driver_ref } = req.body;
    if (!status) {
      return res.status(400).json({ message: 'status is required' });
    }

    const result = await query(
      `UPDATE scheduled_rides
       SET status = $1, driver_ref = COALESCE($3, driver_ref)
       WHERE id = $2
         AND LOWER(status) = 'pending'
         AND driver_ref IS NULL
       RETURNING *`,
      [status, req.params.id, driver_ref || null]
    );
    if (!result.rowCount) {
      const existing = await query(
        `SELECT id, status, driver_ref FROM scheduled_rides WHERE id = $1 LIMIT 1`,
        [req.params.id]
      );
      if (!existing.rowCount) {
        return res.status(404).json({ message: 'Scheduled ride not found.' });
      }
      return res.status(409).json({ message: 'This ride has already been accepted by another driver.' });
    }
    res.json(result.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

export default router;
