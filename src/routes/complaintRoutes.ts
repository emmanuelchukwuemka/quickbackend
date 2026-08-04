import { Router } from 'express';
import { fileComplaint, listComplaints, updateComplaint } from '../controllers/complaintController';
import { requireAdminAuth } from '../middleware/adminAuthMiddleware';

const router = Router();

// Public — for the rider/driver app to file complaints against.
router.post('/', fileComplaint);

// Admin-only management.
router.get('/', requireAdminAuth, listComplaints);
router.put('/:id', requireAdminAuth, updateComplaint);

export default router;
