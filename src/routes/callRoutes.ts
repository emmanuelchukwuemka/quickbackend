import { Router } from 'express';
import { declineCall } from '../controllers/callController';

const router = Router();

router.post('/:callId/decline', declineCall);

export default router;
