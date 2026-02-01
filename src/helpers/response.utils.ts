import config from '../config/config';

export function createSuccessResponse(data: any, message?: string) {
  const response = {
    status: 'success',
    message: message,
    data
  };
  return response;
}

export function createErrorResponse(message: string, data?: any) {
  const response = {
    status: 'error',
    message,
    data: (data && data.message) ? data.message : data,
  };
  return response;
}