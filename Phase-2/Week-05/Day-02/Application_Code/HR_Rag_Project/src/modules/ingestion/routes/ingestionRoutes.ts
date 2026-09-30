import { Router } from "express";
import {
	cleanResumeText,
	detectResumeSkills,
	embedResume,
	extractResumeText,
	getIngestionHealth,
	ingestResume,
	llmParseResume,
	parseResume,
	storeResume,
	uploadResume
} from "../controllers/ingestionController";
import {
	handleMultipleResumeUploads,
	handleResumeUpload
} from "../config/multerConfig";

const ingestionRoutes = Router();

ingestionRoutes.get("/resume/health", getIngestionHealth);
ingestionRoutes.post("/resume/upload", handleResumeUpload, uploadResume);
ingestionRoutes.post("/resume/extract", handleResumeUpload, extractResumeText);
ingestionRoutes.post("/resume/clean", cleanResumeText);
ingestionRoutes.post("/resume/skills", detectResumeSkills);
ingestionRoutes.post("/resume/parse", parseResume);
ingestionRoutes.post("/resume/llm-parse", llmParseResume);
ingestionRoutes.post("/resume/embed", embedResume);
ingestionRoutes.post("/resume/store", storeResume);
ingestionRoutes.post("/resume/ingest", handleMultipleResumeUploads, ingestResume);

export default ingestionRoutes;