import { Router } from 'express';
import { uploadFile } from '../controllers/upload.controller';
import { authenticate } from '../middlewares/authenticate';
import { upload, handleUploadError } from '../middlewares/upload';

const router = Router();

/**
 * POST /api/uploads
 * Uploads a single file (image or PDF, up to 5MB) and returns its URL.
 * Field name: file
 */
router.post('/', authenticate, upload.single('file'), handleUploadError, uploadFile);

export default router;
