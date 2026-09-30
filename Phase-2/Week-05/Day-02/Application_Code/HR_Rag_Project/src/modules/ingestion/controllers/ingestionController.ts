import { unlink } from "node:fs/promises";
import { RequestHandler } from "express";
import { ResumeParserService } from "../services/ResumeParserService";
import { detectSkills } from "../config/skills";
import { cleanText } from "../utils/textCleaner";
import { AlgorithmResumeParser } from "../services/AlgorithmResumeParser";
import { LLMResumeParser } from "../services/LLMResumeParser";
import { env } from "../../../config/env";
import { EmbeddingService } from "../services/EmbeddingService";
import { ResumeIngestionRepository } from "../repositories/ResumeIngestionRepository";
import { ParsedResume } from "../types/ingestion.types";
import {
  ResumeIngestionError,
  ResumeIngestionService
} from "../services/ResumeIngestionService";
import { sendErrorResponse } from "../utils/errorResponse";

const resumeParserService = new ResumeParserService();
const algorithmResumeParser = new AlgorithmResumeParser();
const llmResumeParser = new LLMResumeParser();
const embeddingService = new EmbeddingService();
const resumeIngestionRepository = new ResumeIngestionRepository();
const resumeIngestionService = new ResumeIngestionService();

export const getIngestionHealth: RequestHandler = (_request, response) => {
  response.status(200).json({
    status: "ok",
    module: "resume-ingestion"
  });
};

export const uploadResume: RequestHandler = (request, response) => {
  const file = request.file;

  if (!file) {
    sendErrorResponse(response, 400, "FILE_REQUIRED", "Resume PDF is required");
    return;
  }

  response.status(200).json({
    success: true,
    message: "Resume uploaded successfully",
    file: {
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size
    }
  });
};

export const extractResumeText: RequestHandler = async (request, response) => {
  const file = request.file;

  if (!file) {
    sendErrorResponse(response, 400, "FILE_REQUIRED", "Resume PDF is required");
    return;
  }

  try {
    const rawText = await resumeParserService.extractTextFromPdf(file.path);

    if (!rawText.trim()) {
      sendErrorResponse(response, 422, "RESUME_EXTRACTION_FAILED", "Resume extraction failed");
      return;
    }

    response.status(200).json({
      success: true,
      rawText,
      characters: rawText.length
    });
  } catch {
    sendErrorResponse(response, 422, "RESUME_EXTRACTION_FAILED", "Resume extraction failed");
  } finally {
    await unlink(file.path).catch(() => undefined);
  }
};

export const cleanResumeText: RequestHandler = (request, response) => {
  const rawText = request.body?.rawText;

  if (typeof rawText !== "string") {
    sendErrorResponse(response, 400, "RAW_TEXT_REQUIRED", "rawText must be a string");
    return;
  }

  response.status(200).json({
    success: true,
    cleanText: cleanText(rawText)
  });
};

export const detectResumeSkills: RequestHandler = (request, response) => {
  const rawText = request.body?.rawText;

  if (typeof rawText !== "string") {
    sendErrorResponse(response, 400, "RAW_TEXT_REQUIRED", "rawText must be a string");
    return;
  }

  response.status(200).json({
    success: true,
    skills: detectSkills(rawText)
  });
};

export const parseResume: RequestHandler = async (request, response) => {
  const rawText = request.body?.rawText;

  if (typeof rawText !== "string") {
    sendErrorResponse(response, 400, "RAW_TEXT_REQUIRED", "rawText must be a string");
    return;
  }

  if (!env.useLlmParser) {
    response.status(200).json({
      success: true,
      resume: algorithmResumeParser.parseResume(rawText)
    });
    return;
  }

  try {
    const resume = await llmResumeParser.parseResume(rawText);
    response.status(200).json({ success: true, resume });
  } catch {
    sendErrorResponse(response, 502, "RESUME_PARSE_FAILED", "Resume parsing failed");
  }
};

export const llmParseResume: RequestHandler = async (request, response) => {
  const rawText = request.body?.rawText;

  if (typeof rawText !== "string") {
    sendErrorResponse(response, 400, "RAW_TEXT_REQUIRED", "rawText must be a string");
    return;
  }

  if (!env.useLlmParser) {
    sendErrorResponse(response, 503, "LLM_PARSER_DISABLED", "LLM resume parser is disabled");
    return;
  }

  try {
    const resume = await llmResumeParser.parseResume(rawText);
    response.status(200).json({ success: true, resume });
  } catch {
    sendErrorResponse(response, 502, "RESUME_PARSE_FAILED", "Resume parsing failed");
  }
};

export const embedResume: RequestHandler = async (request, response) => {
  const { name, role, skills, company, experienceSummary, rawText } = request.body ?? {};
  const optionalTextFields = { name, role, company, experienceSummary };

  if (
    typeof rawText !== "string" ||
    !rawText.trim() ||
    !Array.isArray(skills) ||
    skills.some((skill: unknown) => typeof skill !== "string") ||
    Object.values(optionalTextFields).some(
      (value) => value !== undefined && typeof value !== "string"
    )
  ) {
    sendErrorResponse(response, 400, "INVALID_EMBEDDING_REQUEST", "Provide non-empty rawText, a skills array of strings, and optional text fields");
    return;
  }

  try {
    const embedding = await embeddingService.generateResumeEmbedding({
      name,
      role,
      skills,
      company,
      experienceSummary,
      rawText
    });

    response.status(200).json({
      success: true,
      model: env.mistralEmbedModel,
      dimension: embedding.length,
      embedding
    });
  } catch {
    sendErrorResponse(response, 502, "EMBEDDING_FAILED", "Mistral embedding failed");
  }
};

const parsedResumeFields = new Set([
  "name",
  "email",
  "phone",
  "location",
  "company",
  "role",
  "education",
  "totalExperience",
  "relevantExperience",
  "skills",
  "jobTitles",
  "experienceSummary"
]);

function normalizeResume(value: unknown): ParsedResume | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }

  const input = value as Record<string, unknown>;
  if (
    Object.keys(input).some((key) => !parsedResumeFields.has(key)) ||
    !Array.isArray(input.skills) ||
    input.skills.some((skill) => typeof skill !== "string")
  ) {
    return undefined;
  }

  const resume: ParsedResume = { skills: input.skills as string[] };
  const stringFields = [
    "name",
    "email",
    "phone",
    "location",
    "company",
    "role",
    "education",
    "experienceSummary"
  ] as const;

  for (const field of stringFields) {
    const fieldValue = input[field];
    if (fieldValue === undefined || fieldValue === null) continue;
    if (typeof fieldValue !== "string") return undefined;
    resume[field] = fieldValue;
  }

  for (const field of ["totalExperience", "relevantExperience"] as const) {
    const fieldValue = input[field];
    if (fieldValue === undefined || fieldValue === null) continue;
    if (typeof fieldValue !== "number" || !Number.isFinite(fieldValue) || fieldValue < 0) {
      return undefined;
    }
    resume[field] = fieldValue;
  }

  if (input.jobTitles !== undefined && input.jobTitles !== null) {
    if (!Array.isArray(input.jobTitles) || input.jobTitles.some((title) => typeof title !== "string")) {
      return undefined;
    }
    resume.jobTitles = input.jobTitles as string[];
  }

  return resume;
}

export const storeResume: RequestHandler = async (request, response) => {
  const { fileName, resume: rawResume, rawText, embedding } = request.body ?? {};
  const resume = normalizeResume(rawResume);

  if (
    typeof fileName !== "string" ||
    !fileName.trim() ||
    typeof rawText !== "string" ||
    !rawText.trim() ||
    !resume ||
    !Array.isArray(embedding) ||
    embedding.length !== env.embeddingDimension ||
    embedding.some((value: unknown) => typeof value !== "number" || !Number.isFinite(value))
  ) {
    sendErrorResponse(response, 400, "INVALID_RESUME_DATA", "Provide fileName, resume metadata with skills, non-empty rawText, and a valid embedding vector");
    return;
  }

  try {
    const resumeId = await resumeIngestionRepository.storeResume({
      fileName: fileName.trim(),
      resume,
      rawText,
      embedding
    });

    response.status(200).json({
      success: true,
      message: "Resume stored successfully",
      resumeId
    });
  } catch {
    sendErrorResponse(response, 503, "INGESTION_FAILED", "Resume ingestion failed");
  }
};

export const ingestResume: RequestHandler = async (request, response) => {
  const files = request.files;

  if (!Array.isArray(files) || files.length === 0) {
    sendErrorResponse(response, 400, "FILE_REQUIRED", "At least one resume PDF is required");
    return;
  }

  const results = [];

  for (const file of files) {
    try {
      const result = await resumeIngestionService.ingestResume(file);
      results.push({
        success: true,
        fileName: file.originalname,
        resumeId: result.resumeId,
        data: {
          name: result.resume.name ?? null,
          role: result.resume.role ?? null,
          company: result.resume.company ?? null,
          totalExperience: result.resume.totalExperience ?? null,
          skillsCount: result.resume.skills.length,
          embeddingModel: env.mistralEmbedModel,
          embeddingDimension: env.embeddingDimension
        },
        timings: result.timings
      });
    } catch (error) {
      results.push({
        success: false,
        fileName: file.originalname,
        errorCode:
          error instanceof ResumeIngestionError ? error.errorCode : "INGESTION_FAILED",
        message:
          error instanceof ResumeIngestionError ? error.message : "Resume ingestion failed"
      });
    }
  }

  if (results.length === 1 && results[0].success) {
    const { resumeId, data, timings } = results[0];
    response.status(200).json({
      success: true,
      message: "Resume ingestion completed",
      resumeId,
      data,
      timings
    });
    return;
  }

  const successfulCount = results.filter((result) => result.success).length;
  const failedCount = results.length - successfulCount;

  response.status(failedCount === 0 ? 200 : successfulCount === 0 ? 502 : 207).json({
    success: failedCount === 0,
    message:
      failedCount === 0
        ? "Resume ingestion completed"
        : "Resume ingestion completed with errors",
    totalFiles: results.length,
    successfulCount,
    failedCount,
    results
  });
};