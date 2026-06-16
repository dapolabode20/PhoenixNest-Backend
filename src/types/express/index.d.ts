import 'express-serve-static-core';
import { JwtPayload } from 'jsonwebtoken';

declare module 'express-serve-static-core' {
  interface Request {
    auth?: JwtPayload & {
      userId: string;
      email: string;
      profile: 'business_owner' | 'investor';
    };
    files?: {
      [fieldname: string]: Express.Multer.File[];
    } | Express.Multer.File[];
  }
}