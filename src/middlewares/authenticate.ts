import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { tokenRepository } from '../repositories/token.repository';
import config from '../config/config';
import { createErrorResponse } from '../helpers/response.utils';
import { httpStatus } from '../helpers/httpStatus.utils';

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(httpStatus.unauthorized).json(createErrorResponse('Access token is missing'));
    return;
  }

  let decodedToken;
  try {
    decodedToken = jwt.verify(token, config.accessTokenSecret);
  } catch {
    res.status(httpStatus.unauthorized).json(createErrorResponse('Invalid or expired access token'));
    return;
  }
  if (!decodedToken || typeof decodedToken === 'string') {
    res.status(httpStatus.unauthorized).json(createErrorResponse('Invalid access token'));
    return;
  }

  const tokenResult = await tokenRepository.findByToken(token);
  if (tokenResult.err) {
    res.status(httpStatus.serverError).json(createErrorResponse(tokenResult.err.message || 'Error verifying token', tokenResult.err));
    return;
  }
  if (!tokenResult.value) {
    res.status(httpStatus.unauthorized).json(createErrorResponse('Token not found'));
    return;
  }

  if (tokenResult.value.expiresAt < new Date()) {
    res.status(httpStatus.unauthorized).json(createErrorResponse('Token has expired'));
    return;
  }

  req.auth = decodedToken;
  next();
}