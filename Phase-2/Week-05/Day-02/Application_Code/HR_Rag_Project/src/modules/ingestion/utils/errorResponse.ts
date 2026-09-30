import { Response } from "express";

export type ErrorResponsePayload = {
  success: false;
  requestId?: string;
  errorCode: string;
  message: string;
};

export function createErrorPayload(
  requestId: string | undefined,
  errorCodeOrStatus: string | number,
  messageOrCode: string,
  message?: string
): ErrorResponsePayload {
  const errorCode =
    typeof errorCodeOrStatus === "number" ? messageOrCode : errorCodeOrStatus;
  const resolvedMessage =
    typeof errorCodeOrStatus === "number" ? message ?? "" : messageOrCode;

  return {
    success: false,
    ...(requestId ? { requestId } : {}),
    errorCode,
    message: resolvedMessage
  };
}

export function sendErrorResponse(
  response: Response,
  statusCode: number,
  errorCode: string,
  message: string
): void {
  response.status(statusCode).json(
    createErrorPayload(response.locals?.requestId, errorCode, message)
  );
}
