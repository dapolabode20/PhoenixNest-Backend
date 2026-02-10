import { MongoError } from 'mongodb';

export class MongoErrorHandler {
  handleMongoError(error: any): Error {
    // Handle MongoDB-specific errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0];
      return new Error(`Duplicate ${field} already exists`);
    }

    if (error.code === 121) {
      return new Error('Document validation failed');
    }

    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors)
        .map((e: any) => e.message)
        .join(', ');
      return new Error(`Validation error: ${messages}`);
    }

    // Handle cast errors
    if (error.name === 'CastError') {
      return new Error(`Invalid ${error.path}: ${error.value}`);
    }

    // Default error handling
    return error instanceof Error ? error : new Error(String(error));
  }
}
