import { Request, Response } from 'express';
import { fileUploadService } from '../services/fileUpload.service';
import { createErrorResponse, createSuccessResponse } from '../helpers/response.utils';
import { httpStatus } from '../helpers/httpStatus.utils';

// ---------------------------------------------------------------------------
// POST /api/uploads
// Authenticated — uploads a single file to Cloudinary and returns its URL.
// Clients upload here first, then pass the returned url in the relevant
// JSON body (registration, profile update, etc.) instead of attaching files.
// ---------------------------------------------------------------------------
export const uploadFile = async (req: Request, res: Response) => {
  const { userId } = req.auth;

  if (!userId) {
    res.status(httpStatus.unauthorized).json(createErrorResponse('Unauthorised.'));
    return;
  }

  if (!req.file) {
    res.status(httpStatus.badRequest).json(createErrorResponse('File is required.'));
    return;
  }

  const uploadResult = await fileUploadService.upload(req.file.buffer, req.file.mimetype);
  if (uploadResult.err) {
    res.status(httpStatus.serverError).json(createErrorResponse(uploadResult.err.message || 'Failed to upload file.', uploadResult.err));
    return;
  }

  res.status(httpStatus.ok).json(createSuccessResponse({ url: uploadResult.value }, 'File uploaded successfully.'));
};
