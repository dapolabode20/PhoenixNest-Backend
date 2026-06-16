import multer from 'multer';
import path from 'path';
import { Request, Response, NextFunction } from 'express';
import { createErrorResponse } from '../helpers/response.utils';

const storage = multer.memoryStorage(); // Store file in memory as buffer

export const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    const allowedExtensions = ['.jpeg', '.jpg', '.png', '.pdf'];
    const extension = path.extname(file.originalname).toLowerCase();

    if (allowedMimeTypes.includes(file.mimetype) && allowedExtensions.includes(extension)) {
      cb(null, true);
    } else {
      cb(new Error('Only images and PDF files are allowed.'));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

export const handleUploadError = (err: unknown, req: Request, res: Response, next: NextFunction) => {
  if (!err) {
    next();
    return;
  }

  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
    res.status(413).json(createErrorResponse('File size must not exceed 5MB'));
    return;
  }

  if (err instanceof Error && err.message === 'Only images and PDF files are allowed.') {
    res.status(400).json(createErrorResponse(err.message));
    return;
  }

  next(err);
};
