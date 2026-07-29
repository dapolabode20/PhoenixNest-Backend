import { Router } from 'express';
import { uploadFile } from '../controllers/upload.controller';
import { upload, handleUploadError } from '../middlewares/upload';

const router = Router();

/**
 * POST /api/uploads
 * Uploads a single file (image or PDF, up to 5MB) and returns its URL.
 * Field name: file
 * Unauthenticated: needed for pre-registration uploads (e.g. identification
 * documents), before a new user has an access token.
 */
router.post('/', upload.single('file'), handleUploadError, uploadFile);

export default router;
