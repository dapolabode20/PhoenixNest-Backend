import { Router } from 'express';
import authRoutes from './auth';
import discoveryRoutes from './discovery';
import profileRoutes from './profile';

const router = Router();

router.use('/auth', authRoutes);
router.use('/discovery', discoveryRoutes);
router.use('/profile', profileRoutes);

export default router;