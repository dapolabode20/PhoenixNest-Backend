import Joi from 'joi';
import { Result } from '../helpers/result.helpers';

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