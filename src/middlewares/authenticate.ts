import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../helpers/verifyAccessToken';
import { createErrorResponse } from '../helpers/response.utils';
import { httpStatus } from '../helpers/httpStatus.utils';

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(httpStatus.unauthorized).json(createErrorResponse('Access token is missing'));
    return;
  }

  const result = await verifyAccessToken(token);
  if (!result.ok) {
    res.status(httpStatus.unauthorized).json(createErrorResponse(result.reason));
    return;
  }

  req.auth = result.payload;
  next();
}