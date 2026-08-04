import { Router } from 'express';
import { listPromoCodes, createPromoCode, updatePromoCode, deletePromoCode } from '../controllers/promoCodeController';
import { requireAdminAuth } from '../middleware/adminAuthMiddleware';

const router = Router();

router.use(requireAdminAuth);

router.get('/', listPromoCodes);
router.post('/', createPromoCode);
router.put('/:id', updatePromoCode);
router.delete('/:id', deletePromoCode);

export default router;
