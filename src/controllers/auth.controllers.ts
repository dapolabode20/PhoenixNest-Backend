import { Request, Response } from 'express';
import Joi from 'joi';
import { ValidationHelper } from '../helpers/validation.helper';
import { createErrorResponse, createSuccessResponse } from '../helpers/response.utils';

// export const registerUser = async (req: Request, res: Response) => {
//   const validation = ValidationHelper.validateObject(req.body, Joi.object({
//     username: Joi.string().alphanum().min(3).max(30).required(),
//     password: Joi.string().min(6).required(),
//     email: Joi.string().email().required()
//   }));

//   if (validation.err) {
//     return res.status(400).json(createErrorResponse(validation.err.message, validation.err));
//   }


// };