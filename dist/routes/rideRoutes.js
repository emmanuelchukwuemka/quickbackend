"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Ride_1 = __importDefault(require("../models/Ride"));
const rideController_1 = require("../controllers/rideController");
const adminAuthMiddleware_1 = require("../middleware/adminAuthMiddleware");
const router = (0, express_1.Router)();
// GET rides — optional ?status= filter (case-insensitive, comma-separated)
router.get('/', async (req, res) => {
    try {
        const filter = {};
        if (req.query.status) {
            const statuses = req.query.status.split(',').map(s => s.trim());
            filter.status = statuses.length === 1 ? statuses[0] : { $in: statuses };
        }
        const rides = await Ride_1.default.find(filter);
        res.json(rides);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
// GET ride history
router.get('/history/user/:userId', rideController_1.getUserRideHistory);
router.get('/history/driver/:driverId', rideController_1.getDriverRideHistory);
// POST new ride request
router.post('/request', rideController_1.requestRide);
// GET single ride with passenger info (used by driver screens)
router.get('/:id', rideController_1.getRideById);
// Accept ride — support both PUT (spec) and POST (Flutter)
router.put('/:id/accept', rideController_1.acceptRide);
router.post('/:id/accept', rideController_1.acceptRide);
router.post('/:id/accepted', rideController_1.acceptRide);
// Driver arrived at pickup — POST (Flutter fire-and-forget)
router.post('/:id/arrive', rideController_1.arriveRide);
router.post('/:id/arrived', rideController_1.arriveRide);
router.post('/:id/driver-arrived', rideController_1.arriveRide);
router.put('/:id/arrive', rideController_1.arriveRide);
// Start / complete / rate / cancel
router.put('/:id/start', rideController_1.startRide);
router.post('/:id/start', rideController_1.startRide);
router.post('/:id/start-trip', rideController_1.startRide);
router.put('/:id/complete', rideController_1.completeRide);
router.post('/:id/complete', rideController_1.completeRide);
router.post('/:id/rate', rideController_1.rateRide);
router.put('/:id/cancel', rideController_1.cancelRide);
router.post('/:id/cancel', rideController_1.cancelRide);
// Status update
router.put('/:id/status', async (req, res) => {
    try {
        const updatedRide = await Ride_1.default.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
        res.json(updatedRide);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
});
// Admin-only — remove a bad/test/duplicate ride record.
router.delete('/:id', adminAuthMiddleware_1.requireAdminAuth, async (req, res) => {
    try {
        const ride = await Ride_1.default.findById(req.params.id);
        if (!ride)
            return res.status(404).json({ message: 'Ride not found' });
        await Ride_1.default.deleteOne({ id: req.params.id });
        res.json({ message: 'Ride deleted' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
// Legacy POST new ride
router.post('/', async (req, res) => {
    try {
        const newRide = new Ride_1.default(req.body);
        const savedRide = await newRide.save();
        res.status(201).json(savedRide);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
});
exports.default = router;
