import { Router, Request, Response } from 'express';
import Ride from '../models/Ride';
import {
  getRideById, requestRide, acceptRide, arriveRide,
  startRide, completeRide, rateRide, cancelRide,
  getUserRideHistory, getDriverRideHistory,
} from '../controllers/rideController';

const router = Router();

// GET all rides
router.get('/', async (req: Request, res: Response) => {
  try {
    const rides = await Ride.find();
    res.json(rides);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// GET ride history
router.get('/history/user/:userId', getUserRideHistory);
router.get('/history/driver/:driverId', getDriverRideHistory);

// POST new ride request
router.post('/request', requestRide);

// GET single ride with passenger info (used by driver screens)
router.get('/:id', getRideById);

// Accept ride — support both PUT (spec) and POST (Flutter)
router.put('/:id/accept', acceptRide);
router.post('/:id/accept', acceptRide);
router.post('/:id/accepted', acceptRide);

// Driver arrived at pickup — POST (Flutter fire-and-forget)
router.post('/:id/arrive', arriveRide);
router.post('/:id/arrived', arriveRide);
router.post('/:id/driver-arrived', arriveRide);
router.put('/:id/arrive', arriveRide);

// Start / complete / rate / cancel
router.put('/:id/start', startRide);
router.post('/:id/start', startRide);
router.post('/:id/start-trip', startRide);
router.put('/:id/complete', completeRide);
router.post('/:id/complete', completeRide);
router.post('/:id/rate', rateRide);
router.put('/:id/cancel', cancelRide);
router.post('/:id/cancel', cancelRide);

// Status update
router.put('/:id/status', async (req: Request, res: Response) => {
  try {
    const updatedRide = await Ride.findByIdAndUpdate(
      req.params.id as string,
      { status: req.body.status },
      { new: true }
    );
    res.json(updatedRide);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

// Legacy POST new ride
router.post('/', async (req: Request, res: Response) => {
  try {
    const newRide = new Ride(req.body);
    const savedRide = await newRide.save();
    res.status(201).json(savedRide);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

export default router;
