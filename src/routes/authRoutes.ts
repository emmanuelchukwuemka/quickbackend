import { Router } from 'express';
import { requestOtp, verifyOtp, userSignup, userLogin, driverSignup, driverLogin, forgotPassword, resetDriverPassword, googleLogin } from '../controllers/authController';

const router = Router();

router.post('/request-otp', requestOtp);
router.post('/verify-otp', verifyOtp);
router.post('/user-signup', userSignup);
router.post('/user-login', userLogin);
router.post('/driver-signup', driverSignup);
router.post('/driver-login', driverLogin);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetDriverPassword);
router.post('/google-login', googleLogin);

export default router;
