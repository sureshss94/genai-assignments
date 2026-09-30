import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { RequestHandler } from "express";
import multer, { MulterError } from "multer";
import { env } from "../../../config/env";
import { sendErrorResponse } from "../utils/errorResponse";

const maxUploadSizeBytes = 5 * 1024 * 1024;
const maxResumeCount = env.resumeBatchLimit;
const uploadDirectory = resolve(process.cwd(), "uploads");

mkdirSync(uploadDirectory, { recursive: true });

class InvalidResumeFileError extends Error {}

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDirectory,
    filename: (_request, _file, callback) => {
      callback(null, `${randomUUID()}.pdf`);
    }
  }),
  limits: { fileSize: maxUploadSizeBytes, files: maxResumeCount },
  fileFilter: (_request, file, callback) => {
    const hasPdfExtension = file.originalname.toLowerCase().endsWith(".pdf");

    if (!hasPdfExtension || file.mimetype !== "application/pdf") {
      callback(new InvalidResumeFileError());
      return;
    }

    callback(null, true);
  }
});

export const handleResumeUpload: RequestHandler = (request, response, next) => {
  upload.single("file")(request, response, (error) => {
    if (error instanceof InvalidResumeFileError) {
      sendErrorResponse(response, 415, "INVALID_FILE_TYPE", "Only PDF files are allowed");
      return;
    }

    if (error instanceof MulterError && error.code === "LIMIT_FILE_SIZE") {
      sendErrorResponse(response, 413, "FILE_TOO_LARGE", "Resume exceeds maximum upload size");
      return;
    }

    if (error instanceof MulterError && error.code === "LIMIT_UNEXPECTED_FILE") {
      sendErrorResponse(response, 400, "FILE_REQUIRED", "Resume PDF is required");
      return;
    }

    if (error) {
      next(error);
      return;
    }

    if (!request.file) {
      sendErrorResponse(response, 400, "FILE_REQUIRED", "Resume PDF is required");
      return;
    }

    next();
  });
};

export const handleMultipleResumeUploads: RequestHandler = (request, response, next) => {
  upload.array("file", maxResumeCount)(request, response, (error) => {
    if (error instanceof InvalidResumeFileError) {
      sendErrorResponse(response, 415, "INVALID_FILE_TYPE", "Only PDF files are allowed");
      return;
    }

    if (error instanceof MulterError && error.code === "LIMIT_FILE_SIZE") {
      sendErrorResponse(response, 413, "FILE_TOO_LARGE", "Resume exceeds maximum upload size");
      return;
    }

    if (error instanceof MulterError && error.code === "LIMIT_FILE_COUNT") {
      sendErrorResponse(
        response,
        400,
        "MAX_FILES_EXCEEDED",
        `A maximum of ${maxResumeCount} PDF files can be ingested per request`
      );
      return;
    }

    if (
      error instanceof MulterError &&
      error.code === "LIMIT_UNEXPECTED_FILE" &&
      error.field === "file"
    ) {
      sendErrorResponse(
        response,
        400,
        "MAX_FILES_EXCEEDED",
        `A maximum of ${maxResumeCount} PDF files can be ingested per request`
      );
      return;
    }

    if (error) {
      next(error);
      return;
    }

    if (!Array.isArray(request.files) || request.files.length === 0) {
      sendErrorResponse(response, 400, "FILE_REQUIRED", "At least one resume PDF is required");
      return;
    }

    next();
  });
};