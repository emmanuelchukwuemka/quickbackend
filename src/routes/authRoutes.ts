import { Router } from 'express';
import { requestOtp, verifyOtp, driverSignup, driverLogin, forgotPassword } from '../controllers/authController';

const router = Router();

router.post('/request-otp', requestOtp);
router.post('/verify-otp', verifyOtp);
router.post('/driver-signup', driverSignup);
router.post('/driver-login', driverLogin);
router.post('/forgot-password', forgotPassword);

export default router;
