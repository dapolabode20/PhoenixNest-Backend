import { Router } from 'express';
import { loginUser, registerBusinessOwner, registerInvestor, resendOtp, verifyOtp, forgotPassword, resetPassword } from '../controllers/auth.controllers';

const router = Router();

router.post('/login', loginUser);
router.post('/register/business-owner', registerBusinessOwner);
router.post('/register/investor', registerInvestor);
router.post('/resend-otp', resendOtp);
router.post('/verify-otp', verifyOtp);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

export default router;