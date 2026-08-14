import { Router } from 'express';
import { getAllUsers, getUserById, createUser, updateUser, saveFcmToken, deleteOwnAccount } from '../controllers/userController';
import { verifyToken } from '../middleware/authMiddleware';

const router = Router();

router.put('/fcm-token', saveFcmToken);
router.delete('/me', verifyToken, deleteOwnAccount);
router.get('/', getAllUsers);
router.get('/:id', getUserById);
router.post('/', createUser);
router.put('/:id', updateUser);

export default router;
