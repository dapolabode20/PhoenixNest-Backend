export const httpStatus = {
  ok: 200,
  created: 201,
  badRequest: 400,
  unauthorized: 401,
  paymentRequired: 402,
  forbidden: 403,
  notFound: 404,
  conflict: 409,
  payloadTooLarge: 413,
  serverError: 500,
  notImplemented: 501
} as const;
