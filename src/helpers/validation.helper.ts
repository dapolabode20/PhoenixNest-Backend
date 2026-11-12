import Joi from 'joi';
import { Result } from '../helpers/result.helpers';

// Shared rule for any MongoDB id coming from a request (body, params or
// query). A MongoDB id is 24 hex characters; checking that up front means a
// malformed id is rejected as a 400 (the caller's mistake) instead of
// reaching MongoDB and coming back as a 500. Use as `objectId.required()`.
export const objectId = Joi.string().hex().length(24).messages({
  'string.hex': '{#label} must be a valid id',
  'string.length': '{#label} must be a valid id'
});

export class ValidationHelper {
  static validateObject<T>(data: unknown, schema: Joi.Schema<T>): Result<T> {
    const { error, value } = schema.validate(data, { abortEarly: false });
    if (error) {
      const message = error.details.map((detail: any) => detail.message.replace(/\\/g, '')).join('; ');
      return { err: new Error((message.split(';')[0] ?? '').replace(/"/g, '')) };
    } else if (!value) {
      return { err: new Error('invalid data') };
    }
    return { value };
  }
}