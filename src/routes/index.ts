import { Router } from 'express';
import authRoutes from './auth';
import conversationRoutes from './conversation';
import discoveryRoutes from './discovery';
import profileRoutes from './profile';
import uploadRoutes from './upload';

const router = Router();

router.use('/auth', authRoutes);
router.use('/conversations', conversationRoutes);
router.use('/discovery', discoveryRoutes);
router.use('/profile', profileRoutes);
router.use('/uploads', uploadRoutes);

export default router;