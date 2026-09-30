import { RequestHandler } from "express";
import { v4 as uuidv4 } from "uuid";

export const requestId: RequestHandler = (_request, response, next) => {
  const id = uuidv4();
  response.locals.requestId = id;
  response.setHeader("X-Request-Id", id);
  next();
};