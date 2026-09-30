import { RequestHandler } from "express";

export type RequestLogExtra = Record<string, unknown>;

export function buildRequestLogEvent({
  requestId,
  request,
  response,
  startedAt,
  extra = {}
}: {
  requestId?: string;
  request: { method?: string; originalUrl?: string; body?: unknown };
  response: { statusCode: number };
  startedAt: number;
  extra?: RequestLogExtra;
}): Record<string, unknown> {
  return {
    timestamp: new Date().toISOString(),
    requestId,
    method: request.method,
    endpoint: request.originalUrl,
    statusCode: response.statusCode,
    durationMs: Date.now() - startedAt,
    ...extra
  };
}

export const requestLogger: RequestHandler = (request, response, next) => {
  const startedAt = Date.now();

  response.on("finish", () => {
    const event = buildRequestLogEvent({
      requestId: response.locals?.requestId,
      request,
      response,
      startedAt
    });

    console.log(JSON.stringify(event));
  });

  next();
};