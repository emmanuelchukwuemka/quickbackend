import { Router } from 'express';
import { getAllUsers, getUserById, createUser, updateUser, saveFcmToken } from '../controllers/userController';

const router = Router();

router.put('/fcm-token', saveFcmToken);
router.get('/', getAllUsers);
router.get('/:id', getUserById);
router.post('/', createUser);
router.put('/:id', updateUser);

export default router;
