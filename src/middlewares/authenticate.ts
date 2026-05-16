import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import { tokenRepository } from '../repositories/token.repository';
import config from '../config/config';
import { createErrorResponse } from '../helpers/response.utils';

export const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only images and PDF files are allowed'));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 }
});

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json(createErrorResponse('Access token is missing'));
    return;
  }

  const decodedToken = jwt.verify(token, config.accessTokenSecret);
  if (!decodedToken || typeof decodedToken === 'string') {
    res.status(401).json(createErrorResponse('Invalid access token'));
    return;
  }

  const tokenResult = await tokenRepository.findByToken(token);
  if (tokenResult.err) {
    res.status(500).json(createErrorResponse(tokenResult.err.message || 'Error verifying token', tokenResult.err));
    return;
  }
  if (!tokenResult.value) {
    res.status(401).json(createErrorResponse('Token not found'));
    return;
  }

  if (tokenResult.value.expiresAt < new Date()) {
    res.status(401).json(createErrorResponse('Token has expired'));
    return;
  }

  req.auth = decodedToken;
  next();
}