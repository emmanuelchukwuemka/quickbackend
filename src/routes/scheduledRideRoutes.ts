import { Router, Request, Response } from 'express';
import { query } from '../db';
import { v4 as uuid } from 'uuid';

const router = Router();

// GET /api/scheduled-rides?status=Pending&passenger_ref=xxx
router.get('/', async (req: Request, res: Response) => {
  try {
    const { passenger_ref, status } = req.query;
    let sql = `
      SELECT sr.*, u.display_name AS passenger_name, u.phone_number AS passenger_phone
      FROM scheduled_rides sr
      LEFT JOIN users u ON sr.passenger_ref = u.uid
      WHERE 1=1
    `;
    const params: any[] = [];
    if (passenger_ref) {
      params.push(passenger_ref);
      sql += ` AND sr.passenger_ref = $${params.length}`;
    }
    if (status) {
      params.push(status);
      sql += ` AND sr.status = $${params.length}`;
    }
    sql += ' ORDER BY sr.scheduled_time ASC';
    const result = await query(sql, params);
    res.json(result.rows);
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

    const id = uuid();
    const result = await query(
      `INSERT INTO scheduled_rides
        (id, passenger_ref, pickup_address, dropoff_address, estimated_fare, scheduled_time, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'Pending', NOW())
       RETURNING *`,
      [
        id,
        passenger_ref || null,
        pickup_address || '',
        dropoff_address || '',
        estimated_fare || 0,
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
    const { status } = req.body;
    const result = await query(
      `UPDATE scheduled_rides SET status = $1 WHERE id = $2 RETURNING *`,
      [status, req.params.id]
    );
    if (!result.rowCount) return res.status(404).json({ message: 'Not found' });
    res.json(result.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

export default router;
