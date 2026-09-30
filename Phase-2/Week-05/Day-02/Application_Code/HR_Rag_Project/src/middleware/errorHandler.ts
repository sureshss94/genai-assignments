import { ErrorRequestHandler } from "express";
import { env } from "../config/env";
import { createErrorPayload } from "../modules/ingestion/utils/errorResponse";

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  const message =
    env.nodeEnv === "development" && error instanceof Error
      ? error.message
      : "An unexpected error occurred";

  response.status(500).json(
    createErrorPayload(response.locals?.requestId, "INTERNAL_SERVER_ERROR", message)
  );
};